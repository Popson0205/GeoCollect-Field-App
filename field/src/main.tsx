// field/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ProjectsPage from "./pages/ProjectsPage";
import CollectPage from "./pages/CollectPage";
import PublicCollectPage from "./pages/PublicCollectPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/auth"                          element={<AuthPage />} />
        <Route path="/projects"                      element={<ProjectsPage />} />
        <Route path="/collect/:projectId/:formId"    element={<CollectPage />} />
        {/* Public share link — no login required */}
        <Route path="/s/:token"                      element={<PublicCollectPage />} />
        <Route path="*"                              element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
