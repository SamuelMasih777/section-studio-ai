import db from "../db.server";

const TRIAL_THEME_NAME = "Section Studio Demo";
const DEFAULT_TRIAL_THEME_ZIP_URL =
  process.env.TRIAL_THEME_ZIP_URL ||
  "https://res.cloudinary.com/dbz4elldr/raw/upload/v1742011000/trial-theme.zip";

// Using older REST API version to avoid protected scope restrictions
// The protected scope for themeCreate was introduced in GraphQL 2024-10
// REST theme creation may still work with older versions
const REST_API_VERSION = "2024-04";

/**
 * Makes a direct REST API call to Shopify using the session access token.
 */
async function shopifyRest(
  shop: string,
  accessToken: string,
  method: string,
  path: string,
  body?: any,
) {
  const url = `https://${shop}/admin/api/${REST_API_VERSION}/${path}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`REST API error (${method} ${path}):`, JSON.stringify(data));
    throw new Error(
      data.errors
        ? typeof data.errors === "string"
          ? data.errors
          : JSON.stringify(data.errors)
        : `REST API error: ${response.status}`,
    );
  }

  return data;
}

/**
 * Finds existing trial theme or creates one via REST API.
 * Returns the numeric theme ID as a string.
 */
export async function ensureTrialTheme(
  admin: any,
  session: any,
): Promise<string> {
  const shop = session.shop;
  const accessToken = session.accessToken;

  // 1. List all themes to find existing trial
  const listData = await shopifyRest(shop, accessToken, "GET", "themes.json");
  const themes = listData.themes || [];

  const existing = themes.find((t: any) => t.name === TRIAL_THEME_NAME);
  if (existing) {
    console.log(`Trial theme already exists: ${existing.id}`);

    if (existing.processing) {
      await waitForThemeReady(shop, accessToken, existing.id);
    }

    return String(existing.id);
  }

  // 2. Create new unpublished trial theme from ZIP
  console.log("Creating new trial theme...");
  const zipUrl = DEFAULT_TRIAL_THEME_ZIP_URL;

  const createData = await shopifyRest(shop, accessToken, "POST", "themes.json", {
    theme: {
      name: TRIAL_THEME_NAME,
      src: zipUrl,
      role: "unpublished",
    },
  });

  const themeId = String(createData.theme.id);
  console.log(`Trial theme created: ${themeId}`);

  // Wait for Shopify to finish processing the ZIP
  await waitForThemeReady(shop, accessToken, themeId);

  return themeId;
}

/**
 * Polls theme processing status until ready.
 */
async function waitForThemeReady(
  shop: string,
  accessToken: string,
  themeId: string,
  maxWait = 30000,
) {
  const interval = 2000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const data = await shopifyRest(
      shop,
      accessToken,
      "GET",
      `themes/${themeId}.json`,
    );

    if (data.theme && data.theme.processing === false) {
      console.log(`Trial theme ${themeId} is ready.`);
      return;
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error("Trial theme took too long to process");
}

/**
 * Uploads a section's files into the trial theme via REST Asset API.
 */
export async function installSectionToTheme(
  admin: any,
  session: any,
  themeId: string,
  sectionHandle: string,
): Promise<void> {
  const shop = session.shop;
  const accessToken = session.accessToken;

  // Get section files from DB
  const section = await db.section.findUnique({
    where: { handle: sectionHandle },
    include: { files: true },
  });

  if (!section) throw new Error(`Section not found: ${sectionHandle}`);
  if (!section.files || section.files.length === 0) {
    throw new Error(`No files for section: ${sectionHandle}`);
  }

  // Upload each file to the theme
  for (const file of section.files) {
    const fetchResponse = await fetch(file.fileUrl);
    if (!fetchResponse.ok)
      throw new Error(`Failed to fetch file: ${file.fileUrl}`);
    const content = await fetchResponse.text();

    const assetKey =
      file.fileType === "liquid"
        ? `sections/${file.filename}`
        : file.fileType === "css"
          ? `assets/${file.filename}`
          : `snippets/${file.filename}`;

    await shopifyRest(
      shop,
      accessToken,
      "PUT",
      `themes/${themeId}/assets.json`,
      {
        asset: {
          key: assetKey,
          value: content,
        },
      },
    );

    console.log(`Installed: ${assetKey} -> theme ${themeId}`);
  }
}
