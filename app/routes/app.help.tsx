import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const FAQ_ITEMS = [
  {
    question: "How do I add a section to my theme?",
    answer:
      "After purchasing or getting a free section, click 'Add to theme' from the section detail. " +
      "The section files will be automatically installed into your active theme. Then open the Theme " +
      "Editor, navigate to the page where you want the section, and click 'Add section' to find it.",
  },
  {
    question: "Will sections work with my theme?",
    answer:
      "Yes! All sections are built to work with any Shopify theme. They use standard Liquid and " +
      "follow Shopify's section architecture, so they're compatible with Dawn, Debut, and all " +
      "third-party themes.",
  },
  {
    question: "Can I customize the sections?",
    answer:
      "Absolutely. Every section comes with customizable settings that you can adjust from " +
      "Shopify's Theme Editor — colors, text, spacing, images, and more. No coding required.",
  },
  {
    question: "Are free sections really free?",
    answer:
      "Yes, 100%. Free sections can be installed with no payment and no hidden fees. " +
      "Use them forever on your store.",
  },
  {
    question: "What happens after I purchase a section?",
    answer:
      "After a one-time purchase through Shopify's secure billing, the section is permanently " +
      "unlocked for your store. You can install it on your active theme, and reinstall anytime " +
      "if you change themes.",
  },
  {
    question: "Can I use sections on multiple themes?",
    answer:
      "Purchased sections can be installed on any theme within the same store. If you switch " +
      "themes, just reinstall the section from your 'My Sections' library.",
  },
  {
    question: "How do bundles work?",
    answer:
      "Bundles are collections of sections sold at a discounted price. When you purchase a bundle, " +
      "all sections within it are unlocked and can be installed individually.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Since sections are digital products delivered instantly, refunds are handled on a case-by-case " +
      "basis. Contact us if you have any issues and we'll work with you to find a solution.",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <s-page heading="Help & Support">
      {/* FAQ */}
      <s-section heading="Frequently Asked Questions">
        <div className="ss-faq-list">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="ss-faq-item">
              <button
                className="ss-faq-question"
                onClick={() =>
                  setOpenFaq(openFaq === index ? null : index)
                }
              >
                {item.question}
                <span>{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && (
                <div className="ss-faq-answer">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </s-section>

      {/* Contact */}
      <s-section heading="Get in Touch">
        <s-paragraph>
          Can't find what you're looking for? Reach out to us through any of
          these channels.
        </s-paragraph>
        <div className="ss-contact-grid" style={{ marginTop: 16 }}>
          <div className="ss-contact-card">
            <div className="ss-contact-icon">📧</div>
            <h4>Email Support</h4>
            <p>launchcraftstudios@gmail.com</p>
            <s-button
              style={{ marginTop: 12 }}
              onClick={() =>
                window.open(
                  "mailto:launchcraftstudios@gmail.com?subject=Section Studio AI Support",
                )
              }
            >
              Send Email
            </s-button>
          </div>

          <div className="ss-contact-card">
            <div className="ss-contact-icon">💬</div>
            <h4>Request a Section</h4>
            <p>
              Need a custom section? Let us know and we'll consider adding it to
              our library.
            </p>
            <s-button
              style={{ marginTop: 12 }}
              onClick={() =>
                window.open(
                  "mailto:launchcraftstudios@gmail.com?subject=Section Request",
                )
              }
            >
              Request Section
            </s-button>
          </div>

          <div className="ss-contact-card">
            <div className="ss-contact-icon">📖</div>
            <h4>Documentation</h4>
            <p>
              Learn how to use Shopify's Theme Editor to customize installed
              sections.
            </p>
            <s-button
              style={{ marginTop: 12 }}
              onClick={() =>
                window.open(
                  "https://help.shopify.com/en/manual/online-store/themes/theme-structure/sections-and-blocks",
                  "_blank",
                )
              }
            >
              View Docs
            </s-button>
          </div>
        </div>
      </s-section>

      {/* Quick Tips */}
      <s-section heading="Quick Tips">
        <div className="ss-quick-guide">
          <div className="ss-step-card">
            <div className="ss-step-icon">💡</div>
            <h3>Theme Editor Basics</h3>
            <p>
              After installing a section, go to Online Store → Themes →
              Customize. Click "Add section" on any page to find your installed
              sections (prefixed with "SS -").
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">🔄</div>
            <h3>Switching Themes?</h3>
            <p>
              If you change themes, your purchased sections stay in your
              library. Just click "Add to theme" again to install them on your
              new theme.
            </p>
          </div>
          <div className="ss-step-card">
            <div className="ss-step-icon">⭐</div>
            <h3>Use Favorites</h3>
            <p>
              Heart sections you like to save them to your favorites. Access
              them quickly from the Home page or filter by favorites on the
              Sections page.
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
