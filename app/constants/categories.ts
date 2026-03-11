/** Fallback category options when DB has no categories (label + key for filtering) */
export const FALLBACK_CATEGORIES = [
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
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
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

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "📦";
}
