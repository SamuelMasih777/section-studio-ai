/**
 * Category icon lookup.
 *
 * The canonical source of truth for categories is now the DB `Category` table,
 * fetched via GET /api/metadata and stored in `useMarketplaceStore.allCategories`.
 *
 * This file provides a lightweight helper for contexts where the store isn't
 * available (e.g. server-side or non-React code). It falls back to a static
 * emoji map which mirrors the seeded DB values.
 */

const EMOJI_FALLBACK: Record<string, string> = {
  hero: "🦸",
  features: "✨",
  testimonial: "💬",
  faq: "❓",
  video: "🎬",
  scrolling: "↔️",
  payment: "💳",
  counter: "🔢",
  gallery: "🎨",
  "trust-badges": "🛡️",
  comparison: "⚖️",
  banner: "🏷️",
  images: "🖼️",
  product: "🛍️",
  header: "📌",
  footer: "📎",
  snippet: "✂️",
  "countdown-timer": "⏱️",
  other: "📦",
};

export function getCategoryEmoji(handle: string): string {
  return EMOJI_FALLBACK[handle] ?? "📦";
}
