import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { ensureTrialTheme, installSectionToTheme } from "../services/trial-theme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const sectionHandle = formData.get("sectionHandle") as string;

  if (!sectionHandle) {
    return new Response(JSON.stringify({ error: "sectionHandle is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Get or create the trial theme (uses direct REST API)
    const trialThemeId = await ensureTrialTheme(admin, session);

    // 2. Install the section files into that theme
    await installSectionToTheme(admin, session, trialThemeId, sectionHandle);

    // 3. Build the editor URL
    const shop = session.shop;
    const editorUrl = `https://${shop}/admin/themes/${trialThemeId}/editor`;

    return new Response(JSON.stringify({ success: true, editorUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Try section failed:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to prepare trial theme" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
