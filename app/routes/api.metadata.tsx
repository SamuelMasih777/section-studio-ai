/**
 * GET /api/metadata
 *
 * Returns all active categories and tags, ordered by sortOrder.
 * Fetched once on mount and cached client-side alongside sections.
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
  } catch (e) {
    if (process.env.NODE_ENV !== "development") throw e;
  }

  const [categories, tags] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        handle: true,
        name: true,
        emoji: true,
        imageUrl: true,
        description: true,
        sortOrder: true,
      },
    }),
    db.tag.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        handle: true,
        name: true,
        emoji: true,
        imageUrl: true,
        description: true,
        sortOrder: true,
      },
    }),
  ]);

  return Response.json(
    { categories, tags },
    {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    },
  );
};
