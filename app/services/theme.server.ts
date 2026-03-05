export async function getActiveTheme(admin: any) {
  const response = await admin.graphql(
    `#graphql
    query {
      themes(first: 10, roles: [MAIN]) {
        nodes {
          id
          name
          role
        }
      }
    }`,
  );

  const data = await response.json();
  return data.data?.themes?.nodes?.[0] ?? null;
}

export async function installSectionFiles(
  admin: any,
  themeId: string,
  files: Array<{ filename: string; fileUrl: string; fileType: string }>,
) {
  const results = [];

  for (const file of files) {
    const contentResponse = await fetch(file.fileUrl);
    if (!contentResponse.ok) {
      results.push({
        filename: file.filename,
        success: false,
        error: `Failed to download file: ${contentResponse.status}`,
      });
      continue;
    }
    const content = await contentResponse.text();

    const assetKey =
      file.fileType === "liquid"
        ? `sections/${file.filename}`
        : file.fileType === "css"
          ? `assets/${file.filename}`
          : `snippets/${file.filename}`;

    const assetResponse = await admin.graphql(
      `#graphql
      mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          themeId,
          files: [
            {
              filename: assetKey,
              body: { type: "TEXT", value: content },
            },
          ],
        },
      },
    );

    const data = await assetResponse.json();
    const upsertResult = data.data?.themeFilesUpsert;

    if (upsertResult?.userErrors?.length > 0) {
      results.push({
        filename: file.filename,
        success: false,
        error: upsertResult.userErrors
          .map((e: any) => e.message)
          .join(", "),
      });
    } else {
      results.push({ filename: file.filename, success: true });
    }
  }

  return results;
}
