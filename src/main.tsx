import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.tsx";

// Global sync event logger for debugging
if (typeof window !== "undefined") {
  const syncEvents = [
    "sync-data-updated",
    "sync-download",
    "sync-transaction-added",
    "sync-transaction-updated",
    "sync-transaction-conflict-resolved",
    "sync-category-added",
    "sync-category-updated",
    "sync-category-conflict-resolved",
  ];

  syncEvents.forEach((eventType) => {
    window.addEventListener(eventType, (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(`🔄 Sync Event: ${eventType}`, customEvent.detail);
    });
  });

  console.log("✅ Global sync event listeners initialized");
}

createRoot(document.getElementById("root")!).render(
  <>
    <Analytics />
    <App />
  </>,
);
