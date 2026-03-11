/**
 * Legacy route: /app/marketplace
 *
 * We now keep a single marketplace implementation under /app/sections.
 * This route remains only to avoid breaking old links/bookmarks.
 */
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
  return redirect("/app/sections");
};

