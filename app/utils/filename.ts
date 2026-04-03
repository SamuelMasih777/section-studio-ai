/**
 * Sanitizes a filename for Shopify Theme API.
 * Shopify asset filenames can only contain:
 * - Lowercase letters (a-z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - Underscores (_)
 * - Dots (.) for extensions
 *
 * They must not contain spaces or commas.
 */
export function sanitizeShopifyFilename(filename: string): string {
  // 1. Convert to lowercase
  let sanitized = filename.toLowerCase();

  // 2. Replace spaces and commas with underscores
  sanitized = sanitized.replace(/[\s,]+/g, "_");

  // 3. Remove any characters that aren't a-z, 0-9, -, _, or .
  sanitized = sanitized.replace(/[^a-z0-9\-_\.]/g, "");

  // 4. Remove duplicate underscores/hyphens (optional but cleaner)
  sanitized = sanitized.replace(/[_-]{2,}/g, "_");

  // 5. Ensure it doesn't start with a dot or hyphen/underscore
  sanitized = sanitized.replace(/^[.\-_]+/, "");

  return sanitized;
}

/**
 * Determines the correct Shopify theme directory for a given filename based on its extension.
 */
export function getShopifyDirectory(filename: string, fileType: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  // Liquid files
  if (extension === "liquid") {
    // In this app, liquid files are typically sections. 
    // Putting a snippet in sections/ is harmless, but putting a section (with {% schema %}) in snippets/ is a fatal error.
    // Explicit fileType 'snippet' can still override this if added later.
    if (fileType === "snippet") return "snippets";
    return "sections";
  }

  // Assets (CSS, JS, Images, Fonts)
  const assetExtensions = ["css", "js", "png", "jpg", "jpeg", "gif", "svg", "webp", "woff", "woff2", "ttf", "eot"];
  if (fileType === "css" || extension === "css" || assetExtensions.includes(extension || "")) {
    return "assets";
  }

  // Default to snippets for safety
  return "snippets";
}
