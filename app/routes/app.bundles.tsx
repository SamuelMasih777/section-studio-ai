import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getBundles } from "../services/sections.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  const bundles = await getBundles(shop?.id);
  return { bundles, shopId: shop?.id };
};

export default function BundlesPage() {
  const { bundles } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  return (
    <s-page heading="Bundle & Save">
      <s-button slot="primary-action" href="/app/sections" variant="primary">
        Browse individual sections
      </s-button>

      <s-section heading="Save more with bundles">
        <s-paragraph>
          Get a collection of premium sections at a discounted price. Each
          bundle includes multiple sections that work beautifully together.
        </s-paragraph>
      </s-section>

      {bundles.length > 0 ? (
        <s-section>
          <div className="ss-bundle-grid">
            {bundles.map((bundle: any) => {
              const isPurchased = bundle.purchases?.length > 0;
              const originalPrice = bundle.items.reduce(
                (sum: number, item: any) => sum + (item.section.price || 0),
                0,
              );

              return (
                <div key={bundle.id} className="ss-bundle-card">
                  <h3 className="ss-bundle-title">{bundle.title}</h3>
                  {bundle.description && (
                    <p className="ss-bundle-desc">{bundle.description}</p>
                  )}

                  <div className="ss-bundle-sections">
                    {bundle.items.map((item: any) => (
                      <span
                        key={item.id}
                        className="ss-bundle-section-chip"
                      >
                        {item.section.title}
                      </span>
                    ))}
                  </div>

                  <div className="ss-bundle-pricing">
                    <span className="ss-bundle-price">
                      ${(bundle.price / 100).toFixed(0)}
                    </span>
                    {originalPrice > bundle.price && (
                      <>
                        <span className="ss-bundle-original">
                          ${(originalPrice / 100).toFixed(0)}
                        </span>
                        <span className="ss-bundle-discount">
                          Save {bundle.discount}%
                        </span>
                      </>
                    )}
                  </div>

                  {isPurchased ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <s-button variant="primary">
                        ✅ Purchased — Install sections
                      </s-button>
                    </div>
                  ) : (
                    <s-button
                      variant="primary"
                      onClick={() =>
                        navigate(
                          `/api/purchase?bundleId=${bundle.id}&type=bundle`,
                        )
                      }
                    >
                      Buy Bundle
                    </s-button>
                  )}
                </div>
              );
            })}
          </div>
        </s-section>
      ) : (
        <s-section>
          <div className="ss-empty-state">
            <h2>Bundles Coming Soon</h2>
            <p>
              We're putting together amazing section bundles at discounted
              prices. Check back soon!
            </p>
            <s-button href="/app/sections" variant="primary">
              Browse Individual Sections
            </s-button>
          </div>
        </s-section>
      )}

      {/* How Bundles Work */}
      <s-section heading="How Bundles Work">
        <div className="ss-quick-guide">
          <div className="ss-step-card">
            <div className="ss-step-icon">📦</div>
            <div className="ss-step-number">1</div>
            <h3>Choose a Bundle</h3>
            <p>
              Pick a bundle that matches your needs — each includes multiple
              premium sections.
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">💰</div>
            <div className="ss-step-number">2</div>
            <h3>Pay Once, Save Big</h3>
            <p>
              Get up to 25% off compared to buying sections individually.
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">🚀</div>
            <div className="ss-step-number">3</div>
            <h3>Install All Sections</h3>
            <p>
              Every section in the bundle unlocks instantly — install and
              customize at your pace.
            </p>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
