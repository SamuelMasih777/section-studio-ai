import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { toggleFavorite } from "../services/sections.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

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

  const isFavorited = await toggleFavorite(shop.id, sectionId);
  return Response.json({ ok: true, isFavorited });
};
