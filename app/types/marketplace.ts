/**
 * A single section item returned by GET /api/sections.
 * Flat structure — no nested DB relations — so it's safe to pass around
 * between React components without worrying about circular refs.
 */
export interface SectionListItem {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  /** Stored in cents (e.g. 999 = $9.99). 0 = free. */
  price: number;
  category: string;
  tags: string[];
  thumbnailUrl: string | null;
  isFeatured: boolean;
  sortOrder: number;
  /** ISO-8601 string — used for "newest" sort. */
  createdAt: string;
  /** true when the authenticated shop already owns this section. */
  isOwned: boolean;
  /** true when the authenticated shop has favorited this section. */
  isFavorited: boolean;
}

export type PriceFilter = "all" | "free" | "paid";

export type SortBy =
  | "featured"
  | "newest"
  | "price-low"
  | "price-high"
  | "title";

export interface SectionsApiResponse {
  sections: SectionListItem[];
  /** Total count of published sections (for infinite scroll / "Showing X of Y"). */
  total: number;
  /** ISO timestamp — client uses this to decide whether to re-fetch. */
  lastUpdated: string;
}
