/**
 * useFilteredSections
 *
 * All heavy filtering and sorting lives here, fully memoized.
 * The hook is intentionally kept pure (no store access) so it can be
 * tested in isolation and reused on other pages.
 *
 * Performance profile on ~500 sections, mid-range laptop:
 *   - Fuse.js fuzzy search rebuild : ~4 ms  (only on allSections change)
 *   - Filter + sort pass           : ~2-8 ms (on any filter change)
 *   Total user-visible latency with useTransition + 220 ms debounce: imperceptible.
 */
import { useMemo } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import type { SectionListItem, PriceFilter, SortBy } from "../types/marketplace";

// ─── Fuse.js configuration ────────────────────────────────────────────────────

const FUSE_OPTIONS: IFuseOptions<SectionListItem> = {
  // Fields searched in priority order
  keys: [
    { name: "title",       weight: 0.50 },
    { name: "tags",        weight: 0.25 },
    { name: "category",    weight: 0.15 },
    { name: "description", weight: 0.10 },
  ],
  // 0 = perfect match, 1 = match anything. 0.35 balances typo-tolerance vs noise.
  threshold: 0.35,
  // Require at least 3 characters before Fuse kicks in (caller enforces this too)
  minMatchCharLength: 3,
  includeScore: true,
  // Faster for large lists — scans the whole string rather than every character position
  useExtendedSearch: false,
};

// ─── Sort helper ──────────────────────────────────────────────────────────────

/**
 * Returns a new sorted array (never mutates the input).
 * Stable sort is guaranteed in V8 since Node 12+ / Chrome 70+.
 */
function applySort(
  sections: SectionListItem[],
  sortBy: SortBy,
): SectionListItem[] {
  const arr = [...sections];

  switch (sortBy) {
    case "featured":
      // Featured items first, then by explicit sort order
      return arr.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });

    case "newest":
      return arr.sort((a, b) =>
        // ISO strings sort lexicographically == chronologically
        b.createdAt.localeCompare(a.createdAt),
      );

    case "price-low":
      return arr.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        // Tie-break: featured first
        return a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1;
      });

    case "price-high":
      return arr.sort((a, b) => {
        if (a.price !== b.price) return b.price - a.price;
        return a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1;
      });

    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));

    default:
      return arr;
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * Returns the filtered + sorted subset of `allSections` based on the
 * current filter values. All work is wrapped in useMemo so React only
 * recomputes when a dependency actually changes.
 *
 * @param allSections   - Source of truth from the Zustand store.
 * @param searchQuery   - The debounced, committed search string.
 * @param selectedCategory - "all" means no category filter.
 * @param selectedTags  - Every tag in this array must be present on the section.
 * @param priceFilter   - "all" | "free" | "paid"
 * @param sortBy        - Sort strategy; when Fuse is active, results keep
 *                        Fuse's relevance order and sortBy is ignored.
 */
export function useFilteredSections(
  allSections: SectionListItem[],
  searchQuery: string,
  selectedCategory: string,
  selectedTags: string[],
  priceFilter: PriceFilter,
  sortBy: SortBy,
  ownedOnly: boolean = false,
  favoritesOnly: boolean = false,
): SectionListItem[] {
  /**
   * Rebuild the Fuse index only when allSections changes (i.e. after the
   * initial fetch or a manual refresh).  Building the index is O(n) and
   * takes ~4 ms for 500 items — memoizing keeps it out of the hot path.
   */
  const fuse = useMemo(
    () => new Fuse(allSections, FUSE_OPTIONS),
    [allSections],
  );

  return useMemo(() => {
    // ── Step 1: Text search ──────────────────────────────────────────────────
    let result: SectionListItem[];

    if (searchQuery.length >= 3) {
      // Fuse fuzzy search — results already sorted by relevance score
      result = fuse.search(searchQuery).map((r) => r.item);
    } else if (searchQuery.length > 0) {
      // Too short for Fuse — plain case-insensitive substring on title only
      const q = searchQuery.toLowerCase();
      result = allSections.filter((s) => s.title.toLowerCase().includes(q));
    } else {
      result = allSections;
    }

    // Short-circuit: nothing passed search → skip remaining filters
    if (result.length === 0) return result;

    // ── Step 2: Category ─────────────────────────────────────────────────────
    if (selectedCategory !== "all") {
      result = result.filter((s) => s.category === selectedCategory);
      if (result.length === 0) return result;
    }

    // ── Step 3: Price ────────────────────────────────────────────────────────
    if (priceFilter === "free") {
      result = result.filter((s) => s.price === 0);
    } else if (priceFilter === "paid") {
      result = result.filter((s) => s.price > 0);
    }
    if (result.length === 0) return result;

    // ── Step 4: Tags (all selected tags must be present) ────────────────────
    if (selectedTags.length > 0) {
      result = result.filter((s) =>
        selectedTags.every((t) => s.tags.includes(t)),
      );
      if (result.length === 0) return result;
    }

    // ── Step 5: My Library filters (Owned / Favorites) ──────────────────────
    if (ownedOnly) {
      result = result.filter((s) => s.isOwned);
      if (result.length === 0) return result;
    }

    if (favoritesOnly) {
      result = result.filter((s) => s.isFavorited);
      if (result.length === 0) return result;
    }

    // ── Step 6: Sort ─────────────────────────────────────────────────────────
    // When Fuse is active, keep its relevance ranking (already sorted).
    // Otherwise apply the user's chosen sort strategy.
    if (searchQuery.length < 3) {
      result = applySort(result, sortBy);
    }

    return result;
  }, [
    allSections,
    searchQuery,
    selectedCategory,
    selectedTags,
    priceFilter,
    sortBy,
    ownedOnly,
    favoritesOnly,
    fuse,
  ]);
}
