import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./contexts/LanguageContext";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBase } from "./lib/api";
import App from "./App";
import "./index.css";

// Generated endpoints already include /api; preserve the existing external API origin on Render.
setBaseUrl(getApiBase().replace(/\/api$/, "") || null);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </HelmetProvider>
);
