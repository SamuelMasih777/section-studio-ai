/**
 * GET /api/sections
 *
 * Returns published sections in a flat, client-side-filter-friendly shape.
 * Supports pagination: ?limit=50&offset=0 (default 50 per page). The marketplace
 * uses this for infinite scroll: first page on load, next pages on scroll.
 *
 * Query params:
 *   limit  — max items to return (default 50)
 *   offset — skip N items (default 0)
 *
 * Response: { sections, total, lastUpdated }. total = full count of published
 * sections so the client can show "Showing X of Y" and know when to load more.
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import type { SectionListItem } from "../types/marketplace";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let shopId: string | undefined;

  try {
    const { session } = await authenticate.admin(request);
    const shop = await db.shop.findUnique({ where: { domain: session.shop } });
    shopId = shop?.id;
  } catch (e) {
    // Dev fallback: allow unauthenticated access with first offline session
    if (process.env.NODE_ENV === "development") {
      const session = await db.session.findFirst({
        where: { id: { startsWith: "offline_" } },
      });
      if (session) {
        const shop = await db.shop.findUnique({
          where: { domain: session.shop },
        });
        shopId = shop?.id;
      }
    } else {
      throw e;
    }
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

  const where = { isPublished: true };

  // ── Total count + paginated list in one round-trip ─────────────────────
  const [sections, total] = await Promise.all([
    db.section.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        handle: true,
        title: true,
        description: true,
        price: true,
        compareAtPrice: true,
        presetsCount: true,
        category: true,
        tags: true,
        thumbnailUrl: true,
        previewImages: true,
        demoUrl: true,
        isFeatured: true,
        sortOrder: true,
        createdAt: true,
        ...(shopId
          ? {
              ownerships: { where: { shopId }, select: { id: true } },
              favorites:  { where: { shopId }, select: { id: true } },
            }
          : {}),
      },
    }),
    db.section.count({ where }),
  ]);

  // ── Shape into SectionListItem ───────────────────────────────────────────
  const items: SectionListItem[] = (sections as any[]).map((s) => ({
    id:           s.id,
    handle:       s.handle,
    title:        s.title,
    description:  s.description ?? null,
    price:          s.price,
    compareAtPrice: s.compareAtPrice ?? null,
    presetsCount:   s.presetsCount ?? 1,
    category:       s.category,
    tags:         s.tags,
    thumbnailUrl:  s.thumbnailUrl ?? null,
    previewImages: s.previewImages ?? [],
    demoUrl:       s.demoUrl ?? null,
    isFeatured:    s.isFeatured,
    sortOrder:    s.sortOrder,
    createdAt:    (s.createdAt as Date).toISOString(),
    isOwned:      (s.ownerships?.length ?? 0) > 0,
    isFavorited:  (s.favorites?.length  ?? 0) > 0,
  }));

  return Response.json(
    {
      sections: items,
      total,
      lastUpdated: new Date().toISOString(),
    },
    {
      headers: {
        // Let the browser cache for 60 s; serve stale for up to 5 min while revalidating
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
};
