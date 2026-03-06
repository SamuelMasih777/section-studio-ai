import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  getActiveTheme,
  installSectionFiles,
} from "../services/theme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json({ error: "Missing sectionId" }, { status: 400 });
  }

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  // Verify ownership (free sections also get ownership recorded)
  const ownership = await db.sectionOwnership.findUnique({
    where: { shopId_sectionId: { shopId: shop.id, sectionId } },
  });

  if (!ownership) {
    return Response.json(
      { error: "You need to purchase this section first" },
      { status: 403 },
    );
  }

  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: { files: { orderBy: { sortOrder: "asc" } } },
  });

  if (!section || section.files.length === 0) {
    return Response.json(
      { error: "Section has no installable files" },
      { status: 404 },
    );
  }

  const theme = await getActiveTheme(admin);
  if (!theme) {
    return Response.json(
      { error: "No active theme found" },
      { status: 404 },
    );
  }

  const results = await installSectionFiles(admin, theme.id, section.files);

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return Response.json({
      error: `Some files failed to install: ${failed.map((f) => f.error).join(", ")}`,
      results,
    });
  }

  return Response.json({
    success: true,
    message: `${section.title} installed successfully! Open the Theme Editor to add it to a page.`,
    results,
  });
};
