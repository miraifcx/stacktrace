/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { Login } from "./components/Login";
import { Layout } from "./components/Layout";
import { Incidents } from "./pages/Incidents";
import { Settings } from "./pages/Settings";
import { CaseView } from "./pages/CaseView";
import { Analytics } from "./pages/Analytics";
import { GraphView } from "./pages/GraphView";
import { Profile } from "./pages/Profile";
import { ArchivedCases } from "./pages/ArchivedCases";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Analytics />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="archived" element={<ArchivedCases />} />
              <Route path="case/:id" element={<CaseView />} />
              <Route path="graph" element={<GraphView />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Navigate to="/settings" replace />} />
              <Route path="analytics" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

