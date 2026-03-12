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
  /** Original price in cents before discount. null = no discount. */
  compareAtPrice: number | null;
  /** Number of presets included with this section. */
  presetsCount: number;
  category: string;
  tags: string[];
  thumbnailUrl: string | null;
  /** Full-size preview images for the detail modal carousel. */
  previewImages: string[];
  /** Optional demo store URL (external link). */
  demoUrl: string | null;
  isFeatured: boolean;
  sortOrder: number;
  /** ISO-8601 string — used for "newest" sort. */
  createdAt: string;
  /** true when the authenticated shop already owns this section. */
  isOwned: boolean;
  /** true when the authenticated shop has favorited this section. */
  isFavorited: boolean;
}

/** Category metadata from the DB Category table. */
export interface CategoryMeta {
  handle: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
}

/** Tag metadata from the DB Tag table. */
export interface TagMeta {
  handle: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
}

export interface MetadataApiResponse {
  categories: CategoryMeta[];
  tags: TagMeta[];
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
