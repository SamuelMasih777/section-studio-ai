/**
 * /app/sections — Explore Sections (FAST)
 *
 * Single-source page: this replaces the old URL/loader-filtered Explore page.
 * It uses the Marketplace architecture:
 * - Paginated fetch from GET /api/sections (50 at a time) + infinite scroll
 * - Zustand persisted filters (per shop) + Fuse.js fuzzy search
 * - useDeferredValue for instant typing + startTransition for filter updates
 * - Memoized filtering + memoized cards + CSS content-visibility optimizations
 */
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import { useDebounce } from "../hooks/useDebounce";
import { useFilteredSections } from "../hooks/useFilteredSections";
import { useMarketplaceStore } from "../stores/marketplaceStore";
import type {
  CategoryMeta,
  MetadataApiResponse,
  PriceFilter,
  SectionListItem,
  SectionsApiResponse,
  SortBy,
  TagMeta,
} from "../types/marketplace";

const PAGE_SIZE = 50;
const FEATURED_BADGE_LIMIT = 9;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let shopId: string | undefined;
  let shopDomain = "unknown";

  try {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
    const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
    shopId = shop?.id;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      const session = await db.session.findFirst({
        where: { id: { startsWith: "offline_" } },
      });
      if (session) {
        shopDomain = session.shop;
        const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
        shopId = shop?.id;
      }
    } else {
      throw e;
    }
  }

  return { shopId: shopId ?? null, shopDomain };
};

export const headers: HeadersFunction = (args) => boundary.headers(args);

interface ExploreCardProps {
  section: SectionListItem;
  index: number;
  sortBy: SortBy;
  categoryEmoji: string;
  categoryName: string;
  onOpenDetail: (handle: string) => void;
  onFavorite: (sectionId: string) => void;
}

const ExploreCard = memo(function ExploreCard({
  section,
  index,
  sortBy,
  categoryEmoji,
  categoryName,
  onOpenDetail,
  onFavorite,
}: ExploreCardProps) {
  const showFeaturedBadge =
    sortBy === "featured" && section.isFeatured && index < FEATURED_BADGE_LIMIT;

  const priceLabel =
    section.price === 0
      ? "Free"
      : `$${(section.price / 100).toFixed(section.price % 100 === 0 ? 0 : 2)}`;

  return (
    <div
      className="ss-card ss-mp-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(section.handle)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(section.handle);
        }
      }}
      aria-label={`${section.title}, ${priceLabel}`}
    >
      <div className="ss-card-thumb">
        {section.thumbnailUrl ? (
          <img
            src={section.thumbnailUrl}
            alt={section.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="ss-card-thumb-placeholder">
            {categoryEmoji}
          </div>
        )}

        {showFeaturedBadge && (
          <span className="ss-card-badge ss-badge-featured">⭐ Featured</span>
        )}

        {section.isOwned ? (
          <span className="ss-card-badge ss-badge-owned">Owned</span>
        ) : section.price === 0 ? (
          <span className="ss-card-badge ss-badge-free">Free</span>
        ) : (
          <span className="ss-card-badge ss-badge-paid">{priceLabel}</span>
        )}

        <button
          type="button"
          className={`ss-card-fav${
            section.isFavorited ? " ss-card-fav--active" : ""
          }`}
          aria-label={
            section.isFavorited ? "Remove from favorites" : "Add to favorites"
          }
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(section.id);
          }}
        >
          {section.isFavorited ? "❤️" : "🤍"}
        </button>
      </div>

      <div className="ss-card-body">
        <h3 className="ss-card-title">{section.title}</h3>
        <div className="ss-mp-card-meta">
          <span className="ss-mp-card-category">
            {categoryEmoji} {categoryName}
          </span>
          {/* Show a single row of tags; truncate with … when there are more */}
          {section.tags.length > 0 && (
            <>
              {section.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="ss-mp-tag-pill">
                  {tag}
                </span>
              ))}
              {section.tags.length > 3 && (
                <span className="ss-mp-tag-pill">…</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action row: wishlist, open demo in new tab, open preview modal */}
      <div className="ss-card-actions ss-card-actions--icons">
        <button
          type="button"
          className={`ss-card-icon-btn${
            section.isFavorited ? " ss-card-icon-btn--active" : ""
          }`}
          title={section.isFavorited ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(section.id);
          }}
          aria-label={section.isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          {/* Heart icon (outline) */}
          <svg
            aria-hidden="true"
            width={18}
            height={18}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 17.5a1 1 0 0 1-.64-.23l-4.9-4.17A4.5 4.5 0 0 1 3 6.5 3.5 3.5 0 0 1 6.5 3c1.2 0 2.3.55 3 1.42A3.74 3.74 0 0 1 12.5 3 3.5 3.5 0 0 1 16 6.5a4.5 4.5 0 0 1-1.46 3.6l-4.9 4.17a1 1 0 0 1-.64.23Z"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
            />
          </svg>
        </button>

        <button
          type="button"
          className="ss-card-icon-btn"
          title="View demo store"
          onClick={(e) => {
            e.stopPropagation();
            if (section.demoUrl) {
              window.open(section.demoUrl, "_blank", "noopener,noreferrer");
            }
          }}
          aria-label="Open demo in new tab"
        >
          {/* External-link icon from Polaris */}
          <img
            src="https://d1cfqfkbjualid.cloudfront.net/assets/polaris/external_minor-365190dc0a7d03717398e0587eabd2ccfb5536f46051989c5b571729c39faba2.svg"
            alt=""
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="ss-card-icon-btn"
          title="More info"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(section.handle);
          }}
          aria-label="Preview section"
        >
          {/* Eye icon from Polaris */}
          <img
            src="https://d1cfqfkbjualid.cloudfront.net/assets/polaris/view_minor-25846dc545d78a24911d93baf009e3667f764dc4fcd0b75a05c0daae940a4d41.svg"
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
});

function SkeletonCard() {
  return (
    <div className="ss-card ss-mp-card ss-mp-skeleton" aria-hidden="true">
      <div className="ss-card-thumb ss-mp-skeleton-thumb" />
      <div className="ss-card-body">
        <div className="ss-mp-skeleton-line ss-mp-skeleton-line--title" />
        <div className="ss-mp-skeleton-line ss-mp-skeleton-line--sub" />
      </div>
    </div>
  );
}

/* ── Section Detail Modal ───────────────────────────────────────── */

interface SectionDetailModalProps {
  section: SectionListItem;
  onClose: () => void;
  onFavorite: (sectionId: string) => void;
}

const SectionDetailModal = memo(function SectionDetailModal({
  section,
  onClose,
  onFavorite,
}: SectionDetailModalProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const tryFetcher = useFetcher<{ editorUrl?: string; error?: string }>();
  const isTrying = tryFetcher.state !== "idle";

  // Open editor in new tab when ready
  useEffect(() => {
    if (tryFetcher.data?.editorUrl) {
      window.open(tryFetcher.data.editorUrl, "_blank", "noopener,noreferrer");
    }
  }, [tryFetcher.data]);

  const images =
    section.previewImages.length > 0
      ? section.previewImages
      : section.thumbnailUrl
        ? [section.thumbnailUrl]
        : [];

  const isFree = section.price === 0;
  const priceFormatted = `$${(section.price / 100).toFixed(
    section.price % 100 === 0 ? 0 : 2,
  )}`;

  const hasDiscount =
    !isFree && section.compareAtPrice !== null && section.compareAtPrice > section.price;
  const originalPriceFormatted = hasDiscount
    ? `$${(section.compareAtPrice! / 100).toFixed(
        section.compareAtPrice! % 100 === 0 ? 0 : 2,
      )}`
    : null;
  const discountPercent = hasDiscount
    ? Math.round(
        ((section.compareAtPrice! - section.price) / section.compareAtPrice!) * 100,
      )
    : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goImage = useCallback(
    (dir: 1 | -1) => {
      setCurrentImage((i) => {
        const next = i + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length],
  );

  const handleTrySection = useCallback(() => {
    const fd = new FormData();
    fd.set("sectionHandle", section.handle);
    tryFetcher.submit(fd, {
      method: "POST",
      action: "/api/try-section",
    });
  }, [section.handle, tryFetcher]);

  return (
    <div
      className="ss-detail-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={section.title}
    >
      <div className="ss-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ss-detail-header">
          <h2>{section.title}</h2>
          <button
            type="button"
            className="ss-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="ss-detail-body">
          {/* Left column: carousel + details */}
          <div className="ss-detail-left">
            {images.length > 0 && (
              <div className="ss-detail-carousel">
                <div className="ss-detail-carousel-viewport">
                  <img
                    src={images[currentImage]}
                    alt={`${section.title} preview ${currentImage + 1}`}
                    draggable={false}
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="ss-detail-carousel-arrow ss-detail-carousel-prev"
                        onClick={() => goImage(-1)}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="ss-detail-carousel-arrow ss-detail-carousel-next"
                        onClick={() => goImage(1)}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="ss-detail-carousel-dots">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`ss-detail-carousel-dot${
                          i === currentImage ? " ss-detail-carousel-dot--active" : ""
                        }`}
                        onClick={() => setCurrentImage(i)}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {images.length > 1 && (
                  <div className="ss-detail-thumbnails">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`ss-detail-thumb${
                          i === currentImage ? " ss-detail-thumb--active" : ""
                        }`}
                        onClick={() => setCurrentImage(i)}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${i + 1}`}
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section.description && (
              <div className="ss-detail-description">
                <h3>Details:</h3>
                <p>{section.description}</p>
              </div>
            )}
          </div>

          {/* Right column: sticky info card */}
          <div className="ss-detail-right">
            <div className="ss-detail-card">
              <div className="ss-detail-card-top">
                <h3 className="ss-detail-card-title">{section.title}</h3>
                <button
                  type="button"
                  className={`ss-detail-fav${
                    section.isFavorited ? " ss-detail-fav--active" : ""
                  }`}
                  onClick={() => onFavorite(section.id)}
                  aria-label={
                    section.isFavorited
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  {section.isFavorited ? "❤️" : "🤍"}
                </button>
              </div>

              {isFree ? (
                /* ── Free section card ── */
                <>
                  <p className="ss-detail-price-label">Free</p>
                  <button type="button" className="ss-detail-cta ss-detail-cta--free">
                    Get free section ✓
                  </button>
                </>
              ) : (
                /* ── Paid section card ── */
                <>
                  <div className="ss-detail-price-row">
                    <span className="ss-detail-price">{priceFormatted}</span>
                    {hasDiscount && (
                      <span className="ss-detail-price-original">
                        {originalPriceFormatted}
                      </span>
                    )}
                    <span className="ss-detail-price-note">(One-time charge)</span>
                    {hasDiscount && (
                      <span className="ss-detail-discount-badge">
                        {discountPercent}% off
                      </span>
                    )}
                  </div>
                  <button type="button" className="ss-detail-cta ss-detail-cta--paid">
                    Purchase now ✓
                  </button>
                </>
              )}

              {!isFree && (
                <div className="ss-detail-secure">
                  🔒 Secure payment through Shopify
                </div>
              )}

              <ul className="ss-detail-features">
                <li>✅ No recurring fees</li>
                <li>✅ Lifetime access &amp; free updates</li>
                <li>✅ Works with any Shopify theme</li>
                <li>
                  ✨ Includes {section.presetsCount}{" "}
                  {section.presetsCount === 1 ? "preset" : "presets"}
                </li>
              </ul>

              <div className="ss-detail-btn-row">
                {section.demoUrl && (
                  <a
                    href={section.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-detail-btn-secondary"
                  >
                    Demo Store 🔗
                  </a>
                )}
                <button 
                  type="button" 
                  className="ss-detail-btn-secondary"
                  onClick={handleTrySection}
                  disabled={isTrying}
                >
                  {isTrying ? "Preparing editor..." : "Try section 🖼️"}
                </button>
              </div>

              {tryFetcher.data?.error && (
                <div style={{ color: "var(--p-color-text-critical)", marginTop: "10px", fontSize: "13px" }}>
                  ⚠️ {tryFetcher.data.error}
                </div>
              )}

              {!isFree && (
                <div className="ss-detail-bundle-upsell">
                  🎁 Better deal?{" "}
                  <a href="/app/bundles">Bundle &amp; save up to 25%</a>
                  {section.isOwned && (
                    <span className="ss-detail-preadded">
                      (this section's pre-added)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function SectionsPage() {
  const { shopId, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const favoriteFetcher = useFetcher();

  // Runtime data
  const allSections = useMarketplaceStore((s) => s.allSections);
  const totalSections = useMarketplaceStore((s) => s.totalSections);
  const lastUpdated = useMarketplaceStore((s) => s.lastUpdated);
  const isLoading = useMarketplaceStore((s) => s.isLoading);
  const isLoadingMore = useMarketplaceStore((s) => s.isLoadingMore);
  const fetchError = useMarketplaceStore((s) => s.fetchError);
  const dbCategories = useMarketplaceStore((s) => s.allCategories);
  const dbTagsMeta = useMarketplaceStore((s) => s.allTagsMeta);

  // Filters
  const selectedCategory = useMarketplaceStore((s) => s.selectedCategory);
  const selectedTags = useMarketplaceStore((s) => s.selectedTags);
  const priceFilter = useMarketplaceStore((s) => s.priceFilter);
  const sortBy = useMarketplaceStore((s) => s.sortBy);
  const ownedOnly = useMarketplaceStore((s) => s.ownedOnly);
  const favoritesOnly = useMarketplaceStore((s) => s.favoritesOnly);
  const searchQuery = useMarketplaceStore((s) => s.searchQuery);

  // Actions
  const setAllSections = useMarketplaceStore((s) => s.setAllSections);
  const appendSections = useMarketplaceStore((s) => s.appendSections);
  const setLoading = useMarketplaceStore((s) => s.setLoading);
  const setLoadingMore = useMarketplaceStore((s) => s.setLoadingMore);
  const setFetchError = useMarketplaceStore((s) => s.setFetchError);
  const setMetadata = useMarketplaceStore((s) => s.setMetadata);
  const setSearch = useMarketplaceStore((s) => s.setSearch);
  const setCategory = useMarketplaceStore((s) => s.setCategory);
  const toggleTag = useMarketplaceStore((s) => s.toggleTag);
  const clearTags = useMarketplaceStore((s) => s.clearTags);
  const setPriceFilter = useMarketplaceStore((s) => s.setPriceFilter);
  const setSortBy = useMarketplaceStore((s) => s.setSortBy);
  const setOwnedOnly = useMarketplaceStore((s) => s.setOwnedOnly);
  const setFavoritesOnly = useMarketplaceStore((s) => s.setFavoritesOnly);
  const resetFilters = useMarketplaceStore((s) => s.resetFilters);
  const toggleFavoriteOptimistic = useMarketplaceStore(
    (s) => s.toggleFavoriteOptimistic,
  );

  const [isPending, startTransition] = useTransition();

  // Search: instant input + deferred filter value
  const [inputValue, setInputValue] = useState(searchQuery);
  const deferredQuery = useDeferredValue(inputValue);
  const persistQuery = useDebounce(inputValue, 120);
  useEffect(() => {
    setSearch(persistQuery);
  }, [persistQuery, setSearch]);

  const isFilterPending = deferredQuery !== inputValue || isPending;

  // Persist filters per shop
  useEffect(() => {
    if (!shopDomain || shopDomain === "unknown") return;
    useMarketplaceStore.persist.setOptions({
      name: `sections:filters:${shopDomain}`,
    });
    void useMarketplaceStore.persist.rehydrate();
  }, [shopDomain]);

  // Fetch metadata (categories + tags) once on mount
  useEffect(() => {
    if (dbCategories.length > 0) return;
    fetch("/api/metadata", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MetadataApiResponse>;
      })
      .then(({ categories: cats, tags }) => setMetadata(cats, tags))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial fetch (first page)
  useEffect(() => {
    const isStale =
      !lastUpdated ||
      Date.now() - new Date(lastUpdated).getTime() > CACHE_TTL_MS;

    if (!isStale && allSections.length > 0) return;

    setLoading(true);
    fetch(`/api/sections?limit=${PAGE_SIZE}&offset=0`, {
      credentials: "same-origin",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SectionsApiResponse>;
      })
      .then(({ sections, total, lastUpdated: lu }) => {
        setAllSections(sections, total, lu);
      })
      .catch((err: Error) => setFetchError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = totalSections !== null && allSections.length < totalSections;

  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        const offset = useMarketplaceStore.getState().allSections.length;
        const total = useMarketplaceStore.getState().totalSections;
        if (total === null || offset >= total) return;
        if (useMarketplaceStore.getState().isLoadingMore) return;

        useMarketplaceStore.getState().setLoadingMore(true);
        fetch(`/api/sections?limit=${PAGE_SIZE}&offset=${offset}`, {
          credentials: "same-origin",
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<SectionsApiResponse>;
          })
          .then(({ sections, total: t, lastUpdated: lu }) => {
            appendSections(sections, t, lu);
          })
          .catch(() => {
            setLoadingMore(false);
          });
      },
      { rootMargin: "200px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [appendSections, hasMore, isLoading, isLoadingMore, setLoadingMore]);

  // Build a handle->CategoryMeta lookup for icon rendering
  const categoryMap = useMemo(() => {
    const m = new Map<string, CategoryMeta>();
    for (const c of dbCategories) m.set(c.handle, c);
    return m;
  }, [dbCategories]);

  const tagMap = useMemo(() => {
    const m = new Map<string, TagMeta>();
    for (const t of dbTagsMeta) m.set(t.handle, t);
    return m;
  }, [dbTagsMeta]);

  // Categories: DB-sourced metadata + section counts from loaded pages
  const categories = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const s of allSections)
      countMap.set(s.category, (countMap.get(s.category) ?? 0) + 1);

    const items: { key: string; label: string; emoji: string; count: number }[] = [];

    if (dbCategories.length > 0) {
      for (const cat of dbCategories) {
        const count = countMap.get(cat.handle) ?? 0;
        if (count > 0) items.push({ key: cat.handle, label: cat.name, emoji: cat.emoji, count });
      }
    } else {
      for (const [key, count] of countMap.entries()) {
        items.push({ key, label: key, emoji: "📦", count });
      }
      items.sort((a, b) => b.count - a.count);
    }

    return [
      { key: "all", label: "All", emoji: "", count: allSections.length },
      ...items,
    ];
  }, [allSections, dbCategories]);

  // Tags: DB-sourced metadata, filtered to only tags present in loaded sections
  const allTags = useMemo(() => {
    const presentTags = new Set<string>();
    for (const s of allSections) for (const t of s.tags) presentTags.add(t);

    if (dbTagsMeta.length > 0) {
      return dbTagsMeta
        .filter((t) => presentTags.has(t.handle))
        .map((t) => ({ handle: t.handle, name: t.name, emoji: t.emoji }));
    }

    return Array.from(presentTags)
      .sort()
      .map((h) => ({ handle: h, name: h, emoji: "🏷️" }));
  }, [allSections, dbTagsMeta]);

  const filteredSections = useFilteredSections(
    allSections,
    deferredQuery,
    selectedCategory,
    selectedTags,
    priceFilter,
    sortBy,
    ownedOnly,
    favoritesOnly,
  );

  const hasActiveFilters =
    inputValue.length > 0 ||
    selectedCategory !== "all" ||
    selectedTags.length > 0 ||
    priceFilter !== "all" ||
    sortBy !== "featured" ||
    ownedOnly ||
    favoritesOnly;

  // Keep callback identity stable (useFetcher object changes every render)
  const favoriteFetcherRef = useRef(favoriteFetcher);
  useEffect(() => {
    favoriteFetcherRef.current = favoriteFetcher;
  });

  // ── Detail modal state (pure local — no router navigation, instant open) ──
  const [detailHandle, setDetailHandle] = useState<string | null>(null);
  const detailSection = useMemo(
    () =>
      detailHandle
        ? allSections.find((s) => s.handle === detailHandle) ?? null
        : null,
    [detailHandle, allSections],
  );

  const handleOpenDetail = useCallback((handle: string) => {
    setDetailHandle(handle);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailHandle(null);
  }, []);

  const handleFavorite = useCallback(
    (sectionId: string) => {
      toggleFavoriteOptimistic(sectionId);
      const fd = new FormData();
      fd.set("sectionId", sectionId);
      favoriteFetcherRef.current.submit(fd, {
        method: "POST",
        action: "/api/favorite",
      });
    },
    [toggleFavoriteOptimistic],
  );

  const handleReset = useCallback(() => {
    setInputValue("");
    startTransition(() => resetFilters());
  }, [resetFilters, startTransition]);

  // Horizontal scroll state for Category and Tags rows
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [catCanScrollLeft, setCatCanScrollLeft] = useState(false);
  const [catCanScrollRight, setCatCanScrollRight] = useState(false);

  const tagsScrollRef = useRef<HTMLDivElement>(null);
  const [tagCanScrollLeft, setTagCanScrollLeft] = useState(false);
  const [tagCanScrollRight, setTagCanScrollRight] = useState(false);

  useEffect(() => {
    function updateCategoryScroll() {
      const el = categoryScrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      setCatCanScrollLeft(scrollLeft > 0);
      setCatCanScrollRight(scrollLeft < maxScroll - 1);
    }

    const el = categoryScrollRef.current;
    if (!el) return;
    updateCategoryScroll();

    const onScroll = () => updateCategoryScroll();
    const ro = new ResizeObserver(() => updateCategoryScroll());
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [categories.length]);

  useEffect(() => {
    function updateTagsScroll() {
      const el = tagsScrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      setTagCanScrollLeft(scrollLeft > 0);
      setTagCanScrollRight(scrollLeft < maxScroll - 1);
    }

    const el = tagsScrollRef.current;
    if (!el) return;
    updateTagsScroll();

    const onScroll = () => updateTagsScroll();
    const ro = new ResizeObserver(() => updateTagsScroll());
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [allTags.length]);

  return (
    <s-page heading="Explore Sections" inlineSize="large">
      <div className="ss-mp-page">
        {/* Search */}
        <div className="ss-mp-search-row">
          <div className="ss-mp-search-wrap">
            <span className="ss-mp-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              className="ss-mp-search-input"
              placeholder="Search sections by name, tag, or category…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-label="Search sections"
              autoComplete="off"
              spellCheck={false}
            />
            {isLoading && (
              <span className="ss-mp-search-spinner" aria-label="Loading…" />
            )}
            {inputValue.length > 0 && !isLoading && (
              <button
                type="button"
                className="ss-mp-search-clear"
                aria-label="Clear search"
                onClick={() => setInputValue("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {/* Row 1: Category – full width, single row with arrows */}
        <div className="ss-mp-toolbar">
          <div className="ss-mp-filter-group">
            <span className="ss-mp-filter-label">Category</span>
            <div className="ss-mp-scroll-wrapper">
              <button
                type="button"
                className="ss-mp-scroll-arrow"
                onClick={() => {
                  const el = categoryScrollRef.current;
                  if (!el) return;
                  el.scrollBy({ left: -280, behavior: "smooth" });
                }}
                disabled={!catCanScrollLeft}
                aria-label="Scroll categories left"
              >
                ‹
              </button>
              <div ref={categoryScrollRef} className="ss-mp-chips-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`ss-mp-chip${
                      selectedCategory === cat.key ? " ss-mp-chip--active" : ""
                    }`}
                    onClick={() => startTransition(() => setCategory(cat.key))}
                  >
                    {cat.emoji && (
                      <span className="ss-mp-chip-icon">{cat.emoji}</span>
                    )}
                    {cat.label}
                    <span className="ss-mp-chip-count">{cat.count}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ss-mp-scroll-arrow"
                onClick={() => {
                  const el = categoryScrollRef.current;
                  if (!el) return;
                  el.scrollBy({ left: 280, behavior: "smooth" });
                }}
                disabled={!catCanScrollRight}
                aria-label="Scroll categories right"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Sort, Price, My Library in a single row */}
        <div className="ss-mp-toolbar ss-mp-toolbar-row-secondary">
          <div className="ss-mp-filter-group">
            <span className="ss-mp-filter-label">Sort</span>
            <select
              className="ss-mp-sort-select"
              value={sortBy}
              onChange={(e) =>
                startTransition(() => setSortBy(e.target.value as SortBy))
              }
              aria-label="Sort sections"
            >
              <option value="featured">⭐ Featured</option>
              <option value="newest">🆕 Newest</option>
              <option value="price-low">↑ Price: Low → High</option>
              <option value="price-high">↓ Price: High → Low</option>
              <option value="title">🔤 Title A–Z</option>
            </select>
          </div>

          <div className="ss-mp-filter-group">
            <span className="ss-mp-filter-label">Price</span>
            <div className="ss-mp-segment">
              {(["all", "free", "paid"] as PriceFilter[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`ss-mp-segment-btn${
                    priceFilter === p ? " ss-mp-segment-btn--active" : ""
                  }`}
                  onClick={() => startTransition(() => setPriceFilter(p))}
                >
                  {p === "all" ? "All" : p === "free" ? "🎁 Free" : "💳 Paid"}
                </button>
              ))}
            </div>
          </div>

          <div className="ss-mp-filter-group">
            <span className="ss-mp-filter-label">My Library</span>
            <div className="ss-mp-segment">
              <button
                type="button"
                className={`ss-mp-segment-btn${
                  ownedOnly ? " ss-mp-segment-btn--active" : ""
                }`}
                onClick={() => startTransition(() => setOwnedOnly(!ownedOnly))}
              >
                Purchased
              </button>
              <button
                type="button"
                className={`ss-mp-segment-btn${
                  favoritesOnly ? " ss-mp-segment-btn--active" : ""
                }`}
                onClick={() =>
                  startTransition(() => setFavoritesOnly(!favoritesOnly))
                }
              >
                Favorites
              </button>
            </div>
          </div>
        </div>

        {/* Tags – full width, single row with arrows */}
        {allTags.length > 0 && (
          <div className="ss-mp-tags-row">
            <span className="ss-mp-filter-label">Tags</span>
            <div className="ss-mp-scroll-wrapper">
              <button
                type="button"
                className="ss-mp-scroll-arrow"
                onClick={() => {
                  const el = tagsScrollRef.current;
                  if (!el) return;
                  el.scrollBy({ left: -280, behavior: "smooth" });
                }}
                disabled={!tagCanScrollLeft}
                aria-label="Scroll tags left"
              >
                ‹
              </button>
              <div ref={tagsScrollRef} className="ss-mp-tags-scroll">
                {allTags.map((tag) => (
                  <button
                    key={tag.handle}
                    type="button"
                    className={`ss-mp-tag-btn${
                      selectedTags.includes(tag.handle)
                        ? " ss-mp-tag-btn--active"
                        : ""
                    }`}
                    onClick={() => startTransition(() => toggleTag(tag.handle))}
                  >
                    {tag.name}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    className="ss-mp-reset-btn"
                    onClick={() => startTransition(() => clearTags())}
                  >
                    Clear tags
                  </button>
                )}
              </div>
              <button
                type="button"
                className="ss-mp-scroll-arrow"
                onClick={() => {
                  const el = tagsScrollRef.current;
                  if (!el) return;
                  el.scrollBy({ left: 280, behavior: "smooth" });
                }}
                disabled={!tagCanScrollRight}
                aria-label="Scroll tags right"
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* Results header */}
        <div className="ss-mp-results-header">
          <p className="ss-mp-count">
            {isLoading
              ? "Loading sections…"
              : totalSections !== null && totalSections > PAGE_SIZE
                ? `${filteredSections.length} section${
                    filteredSections.length !== 1 ? "s" : ""
                  } found · Showing ${allSections.length} of ${totalSections}`
                : `${filteredSections.length} section${
                    filteredSections.length !== 1 ? "s" : ""
                  } found`}
          </p>
          {hasActiveFilters && !isLoading && (
            <button
              type="button"
              className="ss-mp-reset-btn"
              onClick={handleReset}
            >
              ✕ Reset filters
            </button>
          )}
        </div>

        {/* Error */}
        {fetchError && (
          <div className="ss-mp-error">
            <span>⚠️ Could not load sections: {fetchError}</span>
            <button
              type="button"
              className="ss-mp-error-retry"
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                fetch(`/api/sections?limit=${PAGE_SIZE}&offset=0`, {
                  credentials: "same-origin",
                })
                  .then((r) => r.json() as Promise<SectionsApiResponse>)
                  .then(({ sections, total, lastUpdated: lu }) =>
                    setAllSections(sections, total, lu),
                  )
                  .catch((err: Error) => setFetchError(err.message));
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Initial loading skeleton */}
        {isLoading && allSections.length === 0 && (
          <div className="ss-mp-loading-block">
            <p className="ss-mp-loading-message">Loading perfect sections for you…</p>
            <p className="ss-mp-loading-sub">
              One moment while we get everything ready.
            </p>
            <div className="ss-mp-grid ss-section-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !fetchError && filteredSections.length === 0 && (
          <div className="ss-mp-empty">
            <span className="ss-mp-empty-icon">🔍</span>
            <p className="ss-mp-empty-title">No sections found</p>
            <p className="ss-mp-empty-sub">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="ss-mp-reset-btn ss-mp-reset-btn--lg"
                onClick={handleReset}
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && !fetchError && filteredSections.length > 0 && (
          <>
            <div
              className={`ss-mp-grid ss-section-grid${
                isFilterPending ? " ss-mp-pending" : ""
              }`}
            >
              {filteredSections.map((section, index) => (
                <ExploreCard
                  key={section.id}
                  section={section}
                  index={index}
                  sortBy={sortBy}
                  categoryEmoji={categoryMap.get(section.category)?.emoji ?? "📦"}
                  categoryName={categoryMap.get(section.category)?.name ?? section.category}
                  onOpenDetail={handleOpenDetail}
                  onFavorite={handleFavorite}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="ss-mp-sentinel" aria-hidden="true" />
            )}
            {isLoadingMore && (
              <div className="ss-mp-loading-more">
                <span className="ss-mp-loading-more-spinner" aria-hidden="true" />
                Loading more sections…
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailSection && (
        <SectionDetailModal
          section={detailSection}
          onClose={handleCloseDetail}
          onFavorite={handleFavorite}
        />
      )}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

