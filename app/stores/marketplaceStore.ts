/**
 * Marketplace Zustand store.
 *
 * Architecture notes:
 * - allSections / isLoading / fetchError are runtime data — NOT persisted.
 * - Filter fields are persisted per-shop in localStorage.
 * - We use skipHydration: true so that SSR never touches localStorage,
 *   then manually rehydrate with a shop-scoped key after mount.
 *
 * Usage in a component:
 *   useEffect(() => {
 *     useMarketplaceStore.persist.setOptions({ name: `sections:filters:${shopDomain}` });
 *     void useMarketplaceStore.persist.rehydrate();
 *   }, [shopDomain]);
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SectionListItem, PriceFilter, SortBy } from "../types/marketplace";

// ─── Default filter values ────────────────────────────────────────────────────

export const DEFAULT_FILTERS = {
  searchQuery: "",
  selectedCategory: "all",
  /** Array (not Set) so Zustand persist can JSON-serialise it. */
  selectedTags: [] as string[],
  priceFilter: "all" as PriceFilter,
  sortBy: "featured" as SortBy,
  ownedOnly: false,
  favoritesOnly: false,
} as const;

// ─── Store interface ──────────────────────────────────────────────────────────

interface MarketplaceStore {
  // ── Runtime data (not persisted) ──
  allSections: SectionListItem[];
  /** Total count from API (for infinite scroll: "Showing X of Y"). */
  totalSections: number | null;
  lastUpdated: string | null;
  isLoading: boolean;
  /** True while fetching the next page (infinite scroll). */
  isLoadingMore: boolean;
  fetchError: string | null;

  // ── Persisted filter state ──
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
  priceFilter: PriceFilter;
  sortBy: SortBy;
  ownedOnly: boolean;
  favoritesOnly: boolean;

  // ── Data actions ──
  setAllSections: (sections: SectionListItem[], total: number, lastUpdated: string) => void;
  /** Append next page for infinite scroll. */
  appendSections: (sections: SectionListItem[], total: number, lastUpdated: string) => void;
  setLoading: (v: boolean) => void;
  setLoadingMore: (v: boolean) => void;
  setFetchError: (e: string | null) => void;

  // ── Optimistic ownership / favorite updates ──
  markOwned: (sectionId: string) => void;
  toggleFavoriteOptimistic: (sectionId: string) => void;

  // ── Filter actions ──
  setSearch: (q: string) => void;
  setCategory: (cat: string) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setPriceFilter: (f: PriceFilter) => void;
  setSortBy: (s: SortBy) => void;
  setOwnedOnly: (v: boolean) => void;
  setFavoritesOnly: (v: boolean) => void;
  resetFilters: () => void;
}

// ─── SSR-safe localStorage wrapper ───────────────────────────────────────────

/**
 * Zustand persist needs a storage implementation.
 * We guard every call so the store module is safe to import on the server
 * (React Router v7 imports route modules server-side for SSR).
 */
const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    // Server: return a no-op storage — persist will behave as if empty
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
  return window.localStorage;
});

// ─── Store creation ───────────────────────────────────────────────────────────

export const useMarketplaceStore = create<MarketplaceStore>()(
  persist(
    (set) => ({
      // data defaults
      allSections: [],
      totalSections: null,
      lastUpdated: null,
      isLoading: false,
      isLoadingMore: false,
      fetchError: null,

      // filter defaults
      ...DEFAULT_FILTERS,

      // ── data actions ──
      setAllSections: (sections, total, lastUpdated) =>
        set({
          allSections: sections,
          totalSections: total,
          lastUpdated,
          isLoading: false,
          isLoadingMore: false,
          fetchError: null,
        }),

      appendSections: (sections, total, lastUpdated) =>
        set((s) => ({
          allSections: [...s.allSections, ...sections],
          totalSections: total,
          lastUpdated,
          isLoadingMore: false,
        })),

      setLoading: (v) => set({ isLoading: v }),

      setLoadingMore: (v) => set({ isLoadingMore: v }),

      setFetchError: (e) => set({ fetchError: e, isLoading: false }),

      // When a purchase completes, flip isOwned without refetching
      markOwned: (sectionId) =>
        set((s) => ({
          allSections: s.allSections.map((sec) =>
            sec.id === sectionId ? { ...sec, isOwned: true } : sec,
          ),
        })),

      // Optimistic toggle while the API call is in flight
      toggleFavoriteOptimistic: (sectionId) =>
        set((s) => ({
          allSections: s.allSections.map((sec) =>
            sec.id === sectionId
              ? { ...sec, isFavorited: !sec.isFavorited }
              : sec,
          ),
        })),

      // ── filter actions ──
      setSearch: (q) => set({ searchQuery: q }),

      setCategory: (cat) => set({ selectedCategory: cat }),

      toggleTag: (tag) =>
        set((s) => ({
          selectedTags: s.selectedTags.includes(tag)
            ? s.selectedTags.filter((t) => t !== tag)
            : [...s.selectedTags, tag],
        })),

      clearTags: () => set({ selectedTags: [] }),

      setPriceFilter: (f) => set({ priceFilter: f }),

      setSortBy: (s) => set({ sortBy: s }),

      setOwnedOnly: (v) => set({ ownedOnly: v }),

      setFavoritesOnly: (v) => set({ favoritesOnly: v }),

      resetFilters: () => set({ ...DEFAULT_FILTERS }),
    }),
    {
      // Placeholder key — overridden per-shop via rehydrate() in the component
      name: "sections:filters:default",
      storage: safeStorage,
      /**
       * Skip automatic hydration so SSR never reads localStorage.
       * The component calls persist.rehydrate() after mounting with
       * the correct shop-scoped key.
       */
      skipHydration: true,
      /** Only persist the filter fields — never the fetched data. */
      partialize: (s) => ({
        searchQuery: s.searchQuery,
        selectedCategory: s.selectedCategory,
        selectedTags: s.selectedTags,
        priceFilter: s.priceFilter,
        sortBy: s.sortBy,
        ownedOnly: s.ownedOnly,
        favoritesOnly: s.favoritesOnly,
      }),
    },
  ),
);
