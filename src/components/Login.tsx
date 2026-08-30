import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { loginWithGoogle } from "../firebase";
import { useAuth } from "../AuthContext";
import { Terminal, AlertCircle } from "lucide-react";
import { AsciiSpotlightBackground } from "./AsciiSpotlightBackground";

export function Login() {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setError("Sign-in popup was closed before completion.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site or open in a new tab.");
      } else if (err.code === "auth/unauthorized-domain") {
        const currentDomain = window.location.host;
        setError(
          `Domain Unauthorized: The current domain (${currentDomain}) is not authorized in your Firebase Console (Authentication > Settings > Authorized Domains).`
        );
      } else {
        setError(
          err.message || "Authentication error occurred. If viewing inside an iframe/editor, try opening the app in a new tab."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-full min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 font-sans p-4 select-none">
      {/* Reactive Interactive Spotlight ASCII Grid Canvas */}
      <AsciiSpotlightBackground />

      {/* Main Terminal Login Card */}
      <div className="relative z-10 max-w-md w-full p-8 sm:p-10 bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md border border-zinc-300 dark:border-zinc-800/80 shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mb-5 shadow-inner">
          <Terminal className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
        </div>

        <h1 className="text-xl font-mono uppercase tracking-[0.25em] text-zinc-900 dark:text-zinc-100 mb-2 text-center">StackTrace</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mb-8 leading-relaxed font-mono">
          AI-powered diagnostic logs & incident case management
        </p>

        {error && (
          <div className="w-full mb-6 p-4 border border-red-300 dark:border-red-900/80 bg-red-50/90 dark:bg-red-950/30 flex items-start gap-3 text-red-600 dark:text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed break-words">{error}</p>
          </div>
        )}

        {/* Primary Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border border-transparent disabled:opacity-50 font-mono text-xs font-bold uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          {isLoading ? (
            "AUTHENTICATING..."
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              AUTHENTICATE WITH GOOGLE
            </>
          )}
        </button>
      </div>
    </div>
  );
}


