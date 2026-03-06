import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createOneTimeCharge } from "../services/billing.server";
import {
  recordOwnership,
  recordBundlePurchase,
  getSectionByHandle,
} from "../services/sections.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const sectionId = url.searchParams.get("sectionId");
  const bundleId = url.searchParams.get("bundleId");
  const type = url.searchParams.get("type") || "section";
  const chargeId = url.searchParams.get("charge_id");

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  if (!shop) throw new Response("Shop not found", { status: 404 });

  // Returning from Shopify billing confirmation
  if (chargeId) {
    const { getOneTimeCharge } = await import("../services/billing.server");
    const charge = await getOneTimeCharge(admin, chargeId);

    if (charge?.status === "ACTIVE") {
      if (type === "bundle" && bundleId) {
        await recordBundlePurchase(shop.id, bundleId, chargeId);
      } else if (sectionId) {
        await recordOwnership(shop.id, sectionId, chargeId);
      }
    }

    return redirect("/app/sections?purchased=true");
  }

  // Initiate purchase
  if (type === "bundle" && bundleId) {
    const bundle = await db.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) throw new Response("Bundle not found", { status: 404 });

    const existing = await db.bundlePurchase.findUnique({
      where: { shopId_bundleId: { shopId: shop.id, bundleId } },
    });
    if (existing) return redirect("/app/bundles");

    const appUrl = process.env.SHOPIFY_APP_URL || "";
    const returnUrl = `${appUrl}/api/purchase?bundleId=${bundleId}&type=bundle`;

    const result = await createOneTimeCharge(
      admin,
      `Bundle: ${bundle.title}`,
      bundle.price,
      returnUrl,
    );

    if (result.confirmationUrl) {
      return redirect(result.confirmationUrl);
    }

    return redirect("/app/bundles?error=billing");
  }

  if (sectionId) {
    const section = await db.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new Response("Section not found", { status: 404 });

    // Free section — just record ownership
    if (section.price === 0) {
      await recordOwnership(shop.id, sectionId);
      return redirect(`/app/sections?detail=${section.handle}&unlocked=true`);
    }

    const existing = await db.sectionOwnership.findUnique({
      where: { shopId_sectionId: { shopId: shop.id, sectionId } },
    });
    if (existing) return redirect(`/app/sections?detail=${section.handle}`);

    const appUrl = process.env.SHOPIFY_APP_URL || "";
    const returnUrl = `${appUrl}/api/purchase?sectionId=${sectionId}&type=section`;

    const result = await createOneTimeCharge(
      admin,
      `Section: ${section.title}`,
      section.price,
      returnUrl,
    );

    if (result.confirmationUrl) {
      return redirect(result.confirmationUrl);
    }

    return redirect("/app/sections?error=billing");
  }

  return redirect("/app/sections");
};
