import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuthStore } from "./store/auth";
import { useGameStore } from "./store/game";
import useTheme from "./hooks/useTheme";
import Game from "./components/Game";
import { Loader, Gamepad2, Sun, Moon } from "lucide-react"; // Removed AuthForm specific icons
import ParticlesBackground from "./components/ParticlesBackground";
import AuthForm from "./components/AuthForm"; // Import the extracted component

// AuthForm component code removed and moved to src/components/AuthForm.tsx

function App() {
  const { user, loading: authLoading, checkUser } = useAuthStore();
  const { loadSettings, loading: settingsLoading } = useGameStore();
  const [initialized, setInitialized] = useState(false);
  const { theme, setTheme } = useTheme();

  // Determine the effective theme (light/dark) based on the current state ('light', 'dark', or 'system')
  const effectiveTheme = useMemo(() => {
    if (theme === "system") {
      // Check system preference only on client-side
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light"; // Default to light during SSR or if window is undefined
    }
    return theme;
  }, [theme]);

  // Effect for initial application load (check session, load settings)
  useEffect(() => {
    const init = async () => {
      console.log("App Init: Starting...");
      await Promise.all([checkUser(), loadSettings()]);
      setInitialized(true);
      console.log("App Init: Finished.");
    };
    init();
  }, [checkUser, loadSettings]);

  // Determine if the app is in the initial loading phase
  const isInitializing = !initialized || settingsLoading;

  // Render initial loading screen if not initialized or settings are loading
  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl flex items-center gap-2">
          <Loader size={24} className="animate-spin" />
        </div>
      </div>
    );
  }

  // Once initialized, render the main application structure
  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ParticlesBackground effectiveTheme={effectiveTheme} />
      <div className="min-h-[100dvh] flex flex-col relative z-10">
        <header className="text-center py-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Gamepad2 size={30} />
            Clicker Game
            <button
              onClick={() =>
                setTheme(effectiveTheme === "dark" ? "light" : "dark")
              }
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {effectiveTheme === "dark" ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
            </button>
          </h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col justify-center items-center">
          {/* Conditionally render AuthForm or Game based on user state */}
          {!user ? (
            // Render AuthForm container
            <div className="flex justify-center items-center">
              {/* Pass the authLoading state to AuthForm */}
              {/* This ensures AuthForm does not unmount during auth operations */}
              <AuthForm isLoading={authLoading} />
            </div>
          ) : (
            // Render Game routes if user is logged in
            <Routes>
              <Route path="/" element={<Game />} />
              {/* Assume Game handles its own loading states if needed */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>

        <footer className="text-center text-gray-600 dark:text-gray-400 text-sm py-4">
          Created by Pasha Feldman - Skilled Software Engineer
        </footer>

        {/* Toast notifications container */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme={effectiveTheme}
        />
      </div>
    </Router>
  );
}

export default App;
