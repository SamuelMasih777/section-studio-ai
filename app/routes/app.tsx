import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, useNavigation, useFetchers } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/sections.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    await getOrCreateShop(session.shop);
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      const { unauthenticated } = await import("../shopify.server");
      const session = await db.session.findFirst({
        where: { id: { startsWith: 'offline_' } }
      });
      if (session) {
        await getOrCreateShop(session.shop);
        return { apiKey: process.env.SHOPIFY_API_KEY || "" };
      }
    }
    throw e;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isFetching = fetchers.some(f => f.state !== "idle");
  const isLoading = navigation.state !== "idle" || isFetching;

  return (
    <AppProvider embedded apiKey={apiKey}>
      {isLoading && (
        <div className="ss-linear-loader">
          <div className="ss-linear-loader-bar"></div>
        </div>
      )}
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/sections">Explore Sections</s-link>
        <s-link href="/app/bundles">Bundle & Save</s-link>
        <s-link href="/app/conversion-blocks">Conversion Blocks</s-link>
        <s-link href="/app/help">Help & Support</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
