import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import {
  defaultProviderRetry,
  providerRetryDelay,
} from "./reliability/weatherRetry";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "./design-system/styles.css";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: defaultProviderRetry,
      retryDelay: providerRetryDelay,
      refetchOnWindowFocus: false,
      gcTime: 1800000,
    },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
