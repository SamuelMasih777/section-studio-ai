import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getShopSections, getShopFavorites } from "../services/sections.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  if (!shop) return { sections: [], favorites: [] };

  const [sections, favorites] = await Promise.all([
    getShopSections(shop.id),
    getShopFavorites(shop.id),
  ]);

  return { sections, favorites };
};

export default function HomePage() {
  const { sections, favorites } = useLoaderData<typeof loader>();
  const hasSections = sections.length > 0;

  return (
    <s-page heading="Section Studio AI">
      <s-button slot="primary-action" href="/app/sections" variant="primary">
        Explore all sections
      </s-button>

      {/* My Sections */}
      <s-section heading={`My Sections${hasSections ? ` (${sections.length})` : ""}`}>
        {hasSections ? (
          <div className="ss-home-sections">
            {sections.map((ownership: any) => (
              <div key={ownership.id} className="ss-home-section-card">
                <div className="ss-home-section-thumb">
                  {ownership.section.thumbnailUrl ? (
                    <img
                      src={ownership.section.thumbnailUrl}
                      alt={ownership.section.title}
                    />
                  ) : (
                    <div className="ss-card-thumb-placeholder">📦</div>
                  )}
                </div>
                <div className="ss-home-section-info">
                  <h4>{ownership.section.title}</h4>
                  <p>{ownership.section.category}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ss-empty-state">
            <h2>No Sections Yet, Let's Get You Started</h2>
            <p>
              Browse and explore beautifully designed Shopify sections ready to
              plug-and-play into your theme.
            </p>

            <div className="ss-quick-guide">
              <div className="ss-step-card">
                <div className="ss-step-icon">🔍</div>
                <div className="ss-step-number">1</div>
                <h3>Browse and Find Sections</h3>
                <p>
                  Explore sections and view live demos to pick what fits best.
                </p>
              </div>
              <div className="ss-step-card">
                <div className="ss-step-icon">💳</div>
                <div className="ss-step-number">2</div>
                <h3>Purchase Your Sections</h3>
                <p>
                  Buy once, use forever. Some sections are free to install.
                </p>
              </div>
              <div className="ss-step-card">
                <div className="ss-step-icon">🎨</div>
                <div className="ss-step-number">3</div>
                <h3>Add and Customize Easily</h3>
                <p>
                  Add to your theme and edit it with the Theme Editor.
                </p>
              </div>
            </div>

            <s-button href="/app/sections" variant="primary">
              Explore Sections
            </s-button>
          </div>
        )}
      </s-section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <s-section heading={`Favorites (${favorites.length})`}>
          <div className="ss-home-sections">
            {favorites.map((fav: any) => (
              <div key={fav.id} className="ss-home-section-card">
                <div className="ss-home-section-thumb">
                  {fav.section.thumbnailUrl ? (
                    <img
                      src={fav.section.thumbnailUrl}
                      alt={fav.section.title}
                    />
                  ) : (
                    <div className="ss-card-thumb-placeholder">❤️</div>
                  )}
                </div>
                <div className="ss-home-section-info">
                  <h4>{fav.section.title}</h4>
                  <p>{fav.section.category}</p>
                </div>
              </div>
            ))}
          </div>
        </s-section>
      )}

      {/* Quick Guide */}
      <s-section heading="Quick Guide">
        <s-paragraph>
          See how Section Studio AI works — browse sections, add them to any
          Shopify theme, and customize from the Theme Editor.
        </s-paragraph>
        <div className="ss-quick-guide" style={{ marginTop: "16px" }}>
          <div className="ss-step-card">
            <div className="ss-step-icon">📚</div>
            <h3>Browse the Library</h3>
            <p>
              Search by category, filter by price, and find the perfect section
              for your store.
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">⚡</div>
            <h3>One-Click Install</h3>
            <p>
              Purchased sections install directly into your active theme — no
              code editing needed.
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">🛠️</div>
            <h3>Customize in Editor</h3>
            <p>
              Use Shopify's Theme Editor to adjust every setting — colors, text,
              layout, and more.
            </p>
          </div>
        </div>
      </s-section>

      {/* Footer */}
      <s-section>
        <div className="ss-footer">
          <div className="ss-footer-links">
            <Link to="/app/help">FAQ</Link>
            <Link to="/app/help">Contact Support</Link>
            <Link to="/app/sections">Browse Sections</Link>
            <Link to="/app/bundles">Bundle Deals</Link>
            <a
              href="https://shopify.dev/docs/storefronts/themes/architecture/sections"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shopify Docs
            </a>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
