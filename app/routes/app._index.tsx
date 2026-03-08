import { useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getSections } from "../services/sections.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session: any;
  try {
    const authResult = await authenticate.admin(request);
    session = authResult.session;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      session = await db.session.findFirst({
        where: { id: { startsWith: 'offline_' } }
      });
      if (!session) throw e;
    } else {
      throw e;
    }
  }

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  const { sections } = await getSections({
    shopId: shop?.id,
    limit: 3, // Just a few for the home page
    sort: "popular"
  });

  return { sections, shopName: session.shop.split('.')[0] };
};

export default function Index() {
  const { sections, shopName } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <s-page>
      <s-section heading={`Welcome back, ${shopName}!`}>
        <div className="ss-hero-card">
          <div className="ss-hero-content">
            <h1>Build your dream store in minutes</h1>
            <p>Add premium, high-converting sections to your theme with zero coding required.</p>
            <div className="ss-hero-actions">
              <s-button variant="primary" onClick={() => navigate("/app/sections")}>
                Explore Sections
              </s-button>
              <s-button onClick={() => navigate("/app/bundles")}>
                View Bundles
              </s-button>
            </div>
          </div>
        </div>
      </s-section>

      <div className="ss-home-grid">
        <s-section heading="Featured Sections">
          <div className="ss-section-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {sections.map((section: any) => (
              <div
                key={section.id}
                className="ss-card"
                onClick={() => navigate(`/app/sections?detail=${section.handle}`)}
              >
                <div className="ss-card-thumb">
                  {section.thumbnailUrl ? (
                    <img src={section.thumbnailUrl} alt={section.title} />
                  ) : (
                    <div className="ss-card-thumb-placeholder">✨</div>
                  )}
                </div>
                <div className="ss-card-body">
                  <h3 className="ss-card-title">{section.title}</h3>
                  <span className="ss-card-price">
                    {section.price === 0 ? "Free" : `$${(section.price / 100).toFixed(0)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <s-button onClick={() => navigate("/app/sections")}>
              View All Sections
            </s-button>
          </div>
        </s-section>

        <s-section heading="Quick Actions">
          <div className="ss-quick-actions">
            <div className="ss-action-card" onClick={() => navigate("/app/bundles")}>
              <div className="ss-action-icon">🎁</div>
              <h3>Bundle & Save</h3>
              <p>Get multiple sections for a discounted price.</p>
            </div>
            <div className="ss-action-card" onClick={() => navigate("/app/conversion-blocks")}>
              <div className="ss-action-icon">🚀</div>
              <h3>Conversion Blocks</h3>
              <p>Boost your store's sales with specialized blocks.</p>
            </div>
            <div className="ss-action-card" onClick={() => navigate("/app/help")}>
              <div className="ss-action-icon">❓</div>
              <h3>Help & Support</h3>
              <p>Common questions and contact info.</p>
            </div>
          </div>
        </s-section>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .ss-hero-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
          color: white;
          padding: 40px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .ss-hero-content h1 {
          font-size: 2.5rem;
          margin-bottom: 12px;
          font-weight: 800;
        }
        .ss-hero-content p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 24px;
          max-width: 600px;
        }
        .ss-hero-actions {
          display: flex;
          gap: 12px;
        }
        .ss-home-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ss-quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        .ss-action-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #eee;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ss-action-card:hover {
          border-color: #008060;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transform: translateY(-2px);
        }
        .ss-action-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }
        .ss-action-card h3 {
          margin-bottom: 8px;
          font-weight: 600;
        }
        .ss-action-card p {
          font-size: 0.9rem;
          color: #666;
        }
      `}} />
    </s-page>
  );
}
