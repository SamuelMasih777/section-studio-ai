import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getSections } from "../services/sections.server";

const CONVERSION_CATEGORIES = [
  "trust-badges",
  "counter",
  "payment",
  "comparison",
  "banner",
  "features",
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  const { sections } = await getSections({
    shopId: shop?.id,
    limit: 50,
  });

  const conversionSections = sections.filter((s: any) =>
    CONVERSION_CATEGORIES.includes(s.category),
  );

  return { sections: conversionSections };
};

export default function ConversionBlocksPage() {
  const { sections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <s-page heading="Conversion Blocks">
      <s-button slot="primary-action" href="/app/sections" variant="primary">
        Browse all sections
      </s-button>

      <s-section heading="Boost Your Store's Conversion Rate">
        <s-paragraph>
          These high-converting sections are designed to build trust, create
          urgency, and drive more sales. Add them to any page in your store.
        </s-paragraph>
      </s-section>

      {/* Conversion categories */}
      <s-section heading="Trust & Social Proof">
        <s-paragraph>
          Show customers they can trust your store with trust badges, payment
          icons, and testimonials.
        </s-paragraph>
        {renderSectionGrid(
          sections.filter(
            (s: any) =>
              s.category === "trust-badges" || s.category === "payment",
          ),
          navigate,
        )}
      </s-section>

      <s-section heading="Urgency & Scarcity">
        <s-paragraph>
          Create a sense of urgency with countdown timers, stock counters, and
          limited-time offer banners.
        </s-paragraph>
        {renderSectionGrid(
          sections.filter(
            (s: any) =>
              s.category === "counter" || s.category === "banner",
          ),
          navigate,
        )}
      </s-section>

      <s-section heading="Comparison & Features">
        <s-paragraph>
          Help customers make decisions with comparison tables and feature
          highlight sections.
        </s-paragraph>
        {renderSectionGrid(
          sections.filter(
            (s: any) =>
              s.category === "comparison" || s.category === "features",
          ),
          navigate,
        )}
      </s-section>

      {sections.length === 0 && (
        <s-section>
          <div className="ss-empty-state">
            <h2>Conversion Blocks Coming Soon</h2>
            <p>
              We're building high-converting sections to help boost your store's
              sales. Check back soon!
            </p>
            <s-button href="/app/sections" variant="primary">
              Browse All Sections
            </s-button>
          </div>
        </s-section>
      )}
    </s-page>
  );
}

function renderSectionGrid(sections: any[], navigate: any) {
  if (sections.length === 0) {
    return (
      <s-paragraph>
        <em>No sections in this category yet — check back soon.</em>
      </s-paragraph>
    );
  }

  return (
    <div className="ss-conversion-grid" style={{ marginTop: 12 }}>
      {sections.map((section: any) => {
        const isOwned = section.ownerships?.length > 0;
        return (
          <div key={section.id} className="ss-conversion-card">
            <div className="ss-conversion-thumb">
              {section.thumbnailUrl ? (
                <img src={section.thumbnailUrl} alt={section.title} />
              ) : (
                <div className="ss-card-thumb-placeholder">
                  {section.category === "trust-badges"
                    ? "🛡️"
                    : section.category === "counter"
                      ? "🔢"
                      : "⚡"}
                </div>
              )}
            </div>
            <div className="ss-conversion-body">
              <h3>{section.title}</h3>
              <p>{section.description || "Boost your store's conversions."}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>
                  {section.price === 0
                    ? "Free"
                    : `$${(section.price / 100).toFixed(0)}`}
                </span>
                <s-button
                  size="small"
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/app/sections?detail=${section.handle}`,
                    )
                  }
                >
                  {isOwned ? "Add to theme" : section.price === 0 ? "Get free" : "Buy now"}
                </s-button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
