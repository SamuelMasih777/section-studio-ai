import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SECTIONS = [
  {
    handle: "hero-1",
    title: "Hero #1",
    description:
      "A clean, full-width hero section with heading, subheading, and CTA button. Perfect for landing pages and homepages.",
    price: 0,
    category: "hero",
    tags: ["hero", "free", "landing-page", "full-width"],
    isFeatured: true,
    sortOrder: 1,
  },
  {
    handle: "hero-pro",
    title: "Hero Pro",
    description:
      "Advanced hero section with background video/image support, gradient overlays, animated text, and dual CTA buttons.",
    price: 1400,
    category: "hero",
    tags: ["hero", "premium", "video", "animated"],
    isFeatured: true,
    sortOrder: 2,
  },
  {
    handle: "faq-1",
    title: "FAQ #1",
    description:
      "Accordion-style FAQ section with customizable questions and answers. Clean, minimal design.",
    price: 0,
    category: "faq",
    tags: ["faq", "free", "accordion"],
    sortOrder: 3,
  },
  {
    handle: "faq-2",
    title: "FAQ #2",
    description:
      "Two-column FAQ layout with category tabs. Ideal for stores with many frequently asked questions.",
    price: 900,
    category: "faq",
    tags: ["faq", "tabs", "two-column"],
    sortOrder: 4,
  },
  {
    handle: "feature-1",
    title: "Feature #1",
    description:
      "Icon-based feature highlights in a row. Show free shipping, guarantees, and store benefits.",
    price: 0,
    category: "features",
    tags: ["features", "free", "icons", "trust"],
    isFeatured: true,
    sortOrder: 5,
  },
  {
    handle: "feature-2",
    title: "Feature #2",
    description:
      "Card-based feature section with images, headings, and descriptions. Great for product benefits.",
    price: 900,
    category: "features",
    tags: ["features", "cards", "images"],
    sortOrder: 6,
  },
  {
    handle: "testimonial-1",
    title: "Testimonial #1",
    description:
      "Customer testimonial carousel with photos, names, star ratings, and review text.",
    price: 900,
    category: "testimonial",
    tags: ["testimonial", "carousel", "reviews", "social-proof"],
    isFeatured: true,
    sortOrder: 7,
  },
  {
    handle: "testimonial-8",
    title: "Testimonial #8",
    description:
      "Grid-style testimonials with customer photos. Shows multiple reviews at once for maximum social proof.",
    price: 900,
    category: "testimonial",
    tags: ["testimonial", "grid", "photos"],
    sortOrder: 8,
  },
  {
    handle: "product-videos",
    title: "Product Videos",
    description:
      "Video carousel section for product pages. Display UGC, tutorials, or promotional videos with a modal player.",
    price: 900,
    category: "video",
    tags: ["video", "carousel", "product-page", "ugc"],
    sortOrder: 9,
  },
  {
    handle: "scrolling-announcement",
    title: "Scrolling Announcement Bar",
    description:
      "Animated scrolling text bar for announcements, promotions, or shipping info. Fully customizable speed and colors.",
    price: 900,
    category: "scrolling",
    tags: ["scrolling", "announcement", "animated", "marquee"],
    sortOrder: 10,
  },
  {
    handle: "payment-icons",
    title: "Payment Icons",
    description:
      "Display accepted payment methods with recognizable icons. Builds trust and reduces cart abandonment.",
    price: 900,
    category: "payment",
    tags: ["payment", "trust", "icons", "checkout"],
    sortOrder: 11,
  },
  {
    handle: "counter-1",
    title: "Counter",
    description:
      "Animated number counter section. Show stats like orders fulfilled, happy customers, or years in business.",
    price: 0,
    category: "counter",
    tags: ["counter", "free", "animated", "stats"],
    sortOrder: 12,
  },
  {
    handle: "image-gallery-1",
    title: "Image Gallery #1",
    description:
      "Responsive image gallery with lightbox. Perfect for showcasing products, team photos, or lifestyle images.",
    price: 0,
    category: "gallery",
    tags: ["gallery", "free", "images", "lightbox"],
    sortOrder: 13,
  },
  {
    handle: "trust-badges-1",
    title: "Trust Badges",
    description:
      "Display trust badges and security seals. Includes icons for secure checkout, money-back guarantee, and more.",
    price: 900,
    category: "trust-badges",
    tags: ["trust", "badges", "security", "conversion"],
    sortOrder: 14,
  },
  {
    handle: "comparison-table",
    title: "Comparison Table",
    description:
      "Side-by-side product comparison table. Help customers choose between products or plans with a clear visual layout.",
    price: 900,
    category: "comparison",
    tags: ["comparison", "table", "products", "pricing"],
    sortOrder: 15,
  },
  {
    handle: "banner-promo",
    title: "Promotional Banner",
    description:
      "Eye-catching promotional banner with countdown timer, discount codes, and CTA. Drive urgency and conversions.",
    price: 900,
    category: "banner",
    tags: ["banner", "promo", "countdown", "urgency"],
    sortOrder: 16,
  },
];

const BUNDLES = [
  {
    handle: "starter-pack",
    title: "Starter Pack",
    description:
      "Everything you need to get started. Includes hero, FAQ, features, and testimonial sections.",
    price: 2700,
    discount: 25,
    sectionHandles: ["hero-pro", "faq-2", "feature-2", "testimonial-1"],
  },
  {
    handle: "conversion-bundle",
    title: "Conversion Booster Bundle",
    description:
      "Maximize your store's conversion rate with trust badges, payment icons, banners, and comparison tables.",
    price: 2500,
    discount: 30,
    sectionHandles: [
      "trust-badges-1",
      "payment-icons",
      "banner-promo",
      "comparison-table",
    ],
  },
  {
    handle: "complete-store",
    title: "Complete Store Bundle",
    description:
      "The ultimate collection — every premium section at the best price. Build a complete, professional store.",
    price: 5900,
    discount: 40,
    sectionHandles: [
      "hero-pro",
      "faq-2",
      "feature-2",
      "testimonial-1",
      "testimonial-8",
      "product-videos",
      "scrolling-announcement",
      "payment-icons",
      "trust-badges-1",
      "comparison-table",
      "banner-promo",
    ],
  },
];

async function main() {
  console.log("Seeding sections...");

  for (const sectionData of SECTIONS) {
    const { ...data } = sectionData;
    await prisma.section.upsert({
      where: { handle: data.handle },
      update: data,
      create: data,
    });
    console.log(`  ✓ ${data.title}`);
  }

  console.log("\nSeeding bundles...");

  for (const bundleData of BUNDLES) {
    const { sectionHandles, ...data } = bundleData;

    const bundle = await prisma.bundle.upsert({
      where: { handle: data.handle },
      update: {
        title: data.title,
        description: data.description,
        price: data.price,
        discount: data.discount,
      },
      create: data,
    });

    // Link sections to bundle
    for (const handle of sectionHandles) {
      const section = await prisma.section.findUnique({
        where: { handle },
      });
      if (section) {
        await prisma.bundleItem.upsert({
          where: {
            bundleId_sectionId: {
              bundleId: bundle.id,
              sectionId: section.id,
            },
          },
          update: {},
          create: {
            bundleId: bundle.id,
            sectionId: section.id,
          },
        });
      }
    }

    console.log(`  ✓ ${data.title} (${sectionHandles.length} sections)`);
  }

  console.log("\nDone! Seeded:");
  console.log(`  ${SECTIONS.length} sections`);
  console.log(`  ${BUNDLES.length} bundles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
