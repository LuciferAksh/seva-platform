import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import VerifyEmailPage from "./VerifyEmailPage";
import App from "./App";
import PublicHome from "./PublicHome";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/admin/*" element={<App />} />
        <Route path="/volunteer/*" element={<App />} />
        <Route path="*" element={<PublicHome />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);


if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
}
