import { useState, useCallback } from "react";
import type {
  LoaderFunctionArgs,
  HeadersFunction,
  ActionFunctionArgs,
} from "react-router";
import {
  useLoaderData,
  useSearchParams,
  useNavigate,
  useFetcher,
  Form,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import {
  getSections,
  getCategories,
  getSectionByHandle,
} from "../services/sections.server";

const CATEGORY_ICONS: Record<string, string> = {
  popular: "⭐",
  trending: "🔥",
  newest: "🆕",
  free: "🎁",
  features: "✨",
  testimonial: "💬",
  hero: "🦸",
  video: "🎬",
  scrolling: "↔️",
  "countdown-timer": "⏱️",
  images: "🖼️",
  snippet: "✂️",
  faq: "❓",
  gallery: "🎨",
  product: "🛍️",
  header: "📌",
  footer: "📎",
  banner: "🏷️",
  "trust-badges": "🛡️",
  counter: "🔢",
  payment: "💳",
  comparison: "⚖️",
  other: "📦",
};

const QUICK_TABS = [
  { key: "popular", label: "Popular" },
  { key: "trending", label: "Trending" },
  { key: "newest", label: "Newest" },
  { key: "free", label: "Free" },
  { key: "features", label: "Features" },
  { key: "testimonial", label: "Testimonial" },
  { key: "hero", label: "Hero" },
  { key: "video", label: "Video" },
  { key: "scrolling", label: "Scrolling" },
  { key: "images", label: "Images" },
  { key: "faq", label: "FAQ" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });
  const shopId = shop?.id;

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const priceFilter =
    (url.searchParams.get("price") as "free" | "paid" | "all") || undefined;
  const sort = url.searchParams.get("sort") || "popular";
  const showOwned = url.searchParams.get("owned") === "true";
  const showFavorites = url.searchParams.get("favorites") === "true";
  const detail = url.searchParams.get("detail") || null;

  const [{ sections, total }, categories, detailSection] = await Promise.all([
    getSections({
      query,
      category: mapQuickTab(category),
      priceFilter,
      shopId,
      showOwned,
      showFavorites,
      sort: mapSort(category, sort),
    }),
    getCategories(),
    detail && shopId ? getSectionByHandle(detail, shopId) : null,
  ]);

  return {
    sections,
    total,
    categories,
    detailSection,
    shopId,
    filters: {
      query: query || "",
      category: category || "all",
      price: priceFilter || "all",
      sort,
      owned: showOwned,
      favorites: showFavorites,
    },
  };
};

function mapQuickTab(tab?: string): string | undefined {
  if (!tab || tab === "all" || tab === "popular" || tab === "trending" || tab === "newest") {
    return undefined;
  }
  if (tab === "free") return undefined;
  return tab;
}

function mapSort(category?: string, sort?: string): string {
  if (category === "newest") return "newest";
  return sort || "popular";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });
  if (!shop) return { error: "Shop not found" };

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "favorite") {
    const sectionId = formData.get("sectionId") as string;
    const { toggleFavorite } = await import("../services/sections.server");
    const isFavorited = await toggleFavorite(shop.id, sectionId);
    return { ok: true, isFavorited };
  }

  return { error: "Unknown intent" };
};

export default function SectionsPage() {
  const { sections, total, categories, detailSection, filters } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState(filters.query);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all" && value !== "false") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "q") params.delete("detail");
      navigate(`/app/sections?${params.toString()}`, { replace: true });
    },
    [searchParams, navigate],
  );

  const openDetail = useCallback(
    (handle: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("detail", handle);
      navigate(`/app/sections?${params.toString()}`);
    },
    [searchParams, navigate],
  );

  const closeDetail = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("detail");
    navigate(`/app/sections?${params.toString()}`);
  }, [searchParams, navigate]);

  const handleFavorite = useCallback(
    (e: React.MouseEvent, sectionId: string) => {
      e.stopPropagation();
      fetcher.submit(
        { intent: "favorite", sectionId },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const priceFilterFromTab =
    filters.category === "free" ? "free" : filters.price;

  return (
    <s-page heading="Explore Sections">
      {/* Search */}
      <div className="ss-search-wrapper">
        <Form method="get" action="/app/sections">
          <div className="ss-search-box">
            <span className="ss-search-icon">🔍</span>
            <input
              type="text"
              name="q"
              className="ss-search-input"
              placeholder="Search for sections..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {/* Carry forward current filters */}
            {filters.category !== "all" && (
              <input type="hidden" name="category" value={filters.category} />
            )}
            {filters.price !== "all" && (
              <input type="hidden" name="price" value={filters.price} />
            )}
          </div>
        </Form>
      </div>

      {/* Quick Category Tabs */}
      <div className="ss-category-tabs">
        <button
          className={`ss-cat-tab ${filters.category === "all" ? "active" : ""}`}
          onClick={() => updateFilter("category", "all")}
        >
          <span className="ss-cat-icon">📋</span>
          All
        </button>
        {QUICK_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`ss-cat-tab ${filters.category === tab.key ? "active" : ""}`}
            onClick={() => updateFilter("category", tab.key)}
          >
            <span className="ss-cat-icon">
              {CATEGORY_ICONS[tab.key] || "📦"}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="ss-explore-layout">
        {/* Filters Sidebar */}
        <aside className="ss-filters-sidebar">
          {/* Categories */}
          <div className="ss-filter-group">
            <h4>Categories</h4>
            <label className="ss-filter-item">
              <input
                type="radio"
                name="cat"
                checked={filters.category === "all"}
                onChange={() => updateFilter("category", "all")}
              />
              All
              <span className="ss-filter-count">{total}</span>
            </label>
            {categories.map((cat: any) => (
              <label key={cat.name} className="ss-filter-item">
                <input
                  type="radio"
                  name="cat"
                  checked={filters.category === cat.name}
                  onChange={() => updateFilter("category", cat.name)}
                />
                {cat.name}
                <span className="ss-filter-count">{cat.count}</span>
              </label>
            ))}
          </div>

          {/* Price */}
          <div className="ss-filter-group">
            <h4>Price</h4>
            {["all", "free", "paid"].map((p) => (
              <label key={p} className="ss-filter-item">
                <input
                  type="radio"
                  name="price"
                  checked={priceFilterFromTab === p}
                  onChange={() => updateFilter("price", p)}
                />
                {p === "all" ? "All" : p === "free" ? "Free" : "Paid"}
              </label>
            ))}
          </div>

          {/* My Sections */}
          <div className="ss-filter-group">
            <h4>My Library</h4>
            <label className="ss-filter-item">
              <input
                type="checkbox"
                checked={filters.owned}
                onChange={(e) =>
                  updateFilter("owned", e.target.checked ? "true" : "false")
                }
              />
              Purchased
            </label>
            <label className="ss-filter-item">
              <input
                type="checkbox"
                checked={filters.favorites}
                onChange={(e) =>
                  updateFilter(
                    "favorites",
                    e.target.checked ? "true" : "false",
                  )
                }
              />
              Favorites
            </label>
          </div>
        </aside>

        {/* Sections Grid */}
        <div className="ss-sections-main">
          <div className="ss-results-header">
            <span className="ss-results-count">
              Showing {sections.length} of {total} sections
            </span>
            <select
              className="ss-sort-select"
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {sections.length > 0 ? (
            <div className="ss-section-grid">
              {sections.map((section: any) => {
                const isOwned = section.ownerships?.length > 0;
                const isFav = section.favorites?.length > 0;

                return (
                  <div
                    key={section.id}
                    className="ss-card"
                    onClick={() => openDetail(section.handle)}
                  >
                    <div className="ss-card-thumb">
                      {section.thumbnailUrl ? (
                        <img
                          src={section.thumbnailUrl}
                          alt={section.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="ss-card-thumb-placeholder">
                          {CATEGORY_ICONS[section.category] || "📦"}
                        </div>
                      )}
                      <button
                        className="ss-card-fav"
                        onClick={(e) => handleFavorite(e, section.id)}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        {isFav ? "❤️" : "🤍"}
                      </button>
                      {isOwned ? (
                        <span className="ss-card-badge ss-badge-owned">
                          Owned
                        </span>
                      ) : section.price === 0 ? (
                        <span className="ss-card-badge ss-badge-free">
                          Free
                        </span>
                      ) : (
                        <span className="ss-card-badge ss-badge-paid">
                          Paid
                        </span>
                      )}
                    </div>
                    <div className="ss-card-body">
                      <h3 className="ss-card-title">{section.title}</h3>
                      <span className="ss-card-price">
                        {section.price === 0
                          ? "Free"
                          : `$${(section.price / 100).toFixed(0)}`}
                      </span>
                    </div>
                    <div className="ss-card-actions">
                      {isOwned ? (
                        <s-button
                          variant="primary"
                          size="small"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            openDetail(section.handle);
                          }}
                        >
                          Add to theme
                        </s-button>
                      ) : section.price === 0 ? (
                        <s-button
                          variant="primary"
                          size="small"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            openDetail(section.handle);
                          }}
                        >
                          Get free section
                        </s-button>
                      ) : (
                        <s-button
                          variant="primary"
                          size="small"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            openDetail(section.handle);
                          }}
                        >
                          Buy now
                        </s-button>
                      )}
                      <s-button
                        size="small"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          openDetail(section.handle);
                        }}
                      >
                        Preview
                      </s-button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ss-empty-state">
              <h2>No sections found</h2>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailSection && (
        <SectionDetailModal
          section={detailSection}
          onClose={closeDetail}
          onFavorite={handleFavorite}
          fetcher={fetcher}
        />
      )}
    </s-page>
  );
}

function SectionDetailModal({
  section,
  onClose,
  onFavorite,
  fetcher,
}: {
  section: any;
  onClose: () => void;
  onFavorite: (e: React.MouseEvent, id: string) => void;
  fetcher: any;
}) {
  const isOwned = section.ownerships?.length > 0;
  const isFav = section.favorites?.length > 0;
  const navigate = useNavigate();

  const handlePurchase = () => {
    if (section.price === 0) {
      fetcher.submit(
        { intent: "install", sectionId: section.id },
        { method: "POST", action: "/api/install" },
      );
    } else {
      navigate(
        `/api/purchase?sectionId=${section.id}&type=section`,
      );
    }
  };

  return (
    <div className="ss-modal-overlay" onClick={onClose}>
      <div className="ss-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-modal-header">
          <h2>{section.title}</h2>
          <button className="ss-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ss-modal-body">
          <div className="ss-modal-preview">
            {section.thumbnailUrl ? (
              <img src={section.thumbnailUrl} alt={section.title} />
            ) : (
              <div
                className="ss-card-thumb-placeholder"
                style={{ height: 300, borderRadius: 8 }}
              >
                {CATEGORY_ICONS[section.category] || "📦"}
              </div>
            )}
          </div>

          <div className="ss-modal-info">
            <div className="ss-modal-price">
              {section.price === 0
                ? "Free"
                : `$${(section.price / 100).toFixed(0)}`}
            </div>

            <ul className="ss-modal-meta">
              {section.price === 0 && <li>✅ No recurring fees</li>}
              {section.price > 0 && <li>✅ Lifetime access & free updates</li>}
              <li>✅ Works with any Shopify theme</li>
              <li>✅ Customize from Theme Editor</li>
              <li>
                📁 {section.files?.length || 0} file
                {section.files?.length !== 1 ? "s" : ""}
              </li>
            </ul>

            <div className="ss-modal-actions">
              {isOwned ? (
                <s-button
                  variant="primary"
                  onClick={() => {
                    fetcher.submit(
                      { intent: "install", sectionId: section.id },
                      { method: "POST", action: "/api/install" },
                    );
                  }}
                >
                  Add to theme
                </s-button>
              ) : (
                <s-button variant="primary" onClick={handlePurchase}>
                  {section.price === 0
                    ? "Get free section ✓"
                    : `Purchase now — $${(section.price / 100).toFixed(0)}`}
                </s-button>
              )}

              {section.demoUrl && (
                <s-button
                  onClick={() => window.open(section.demoUrl, "_blank")}
                >
                  Demo Store
                </s-button>
              )}

              <s-button onClick={(e: any) => onFavorite(e, section.id)}>
                {isFav ? "❤️ Favorited" : "🤍 Add to Favorites"}
              </s-button>
            </div>
          </div>
        </div>

        {section.description && (
          <div className="ss-modal-desc">
            <h3>Details</h3>
            <p>{section.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
