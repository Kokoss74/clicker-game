import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuthStore } from "./store/auth";
import { useGameStore } from "./store/game";
import useTheme from "./hooks/useTheme";
import Game from "./components/Game";
import {
  Phone,
  UserPlus,
  LogIn,
  AlertTriangle,
  Loader,
  Gamepad2,
  Sun,
  Moon,
} from "lucide-react";
import ParticlesBackground from "./components/ParticlesBackground";

interface AuthFormProps {
  isLoading: boolean;
}

function AuthForm({ isLoading }: AuthFormProps) {
  const { signIn, signUp, error } = useAuthStore();
  const [isSignUp, setIsSignUp] = React.useState(false); // Initial mode is Sign In
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null); // Local error for display

  // Effect to sync store error to local error and handle auto-switch *to* Sign Up
  React.useEffect(() => {
    if (error) {
      setLocalError(error);
      // Auto-switch TO Sign Up only if in Sign In mode and error is "Invalid login credentials"
      if (!isSignUp && error === "Invalid login credentials") {
        console.log(
          "AuthForm Effect: Invalid credentials on Sign In, switching to Sign Up."
        );
        toast.error("User not registered. Please create an account.");
        setIsSignUp(true);
      }
    } else {
      // Clear local error if store error is cleared
      setLocalError(null);
    }
  }, [error, isSignUp]);

  // Clear local error on input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setLocalError(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setLocalError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Don't submit if already loading
    if (isLoading) return;
    // Clear previous local error before new submission attempt
    setLocalError(null);
    console.log(
      `AuthForm: Handling submit. Mode: ${isSignUp ? "Sign Up" : "Sign In"}`
    );

    if (isSignUp) {
      // Basic client-side validation for name length
      if (name.trim().length < 3) {
        console.warn("AuthForm: Sign up validation failed - name too short.");
        setLocalError("Name must be at least 3 characters long");
        return; // Stop submission
      }
      console.log("AuthForm: Calling signUp with phone:", phone, "name:", name);
      await signUp({ phone, name });
    } else {
      console.log("AuthForm: Calling signIn with phone:", phone);
      await signIn({ phone });
    }
    console.log("AuthForm: Submit handler finished.");
  };

  const handleToggleMode = () => {
    if (isLoading) return;
    console.log(
      `AuthForm: Toggling form mode to ${!isSignUp ? "Sign Up" : "Sign In"}`
    );
    setIsSignUp(!isSignUp);
    setLocalError(null); // Clear error display on mode switch
    // Clear input fields on mode switch for better UX
    setPhone("");
    setName("");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative text-gray-900 dark:text-white transition-colors duration-200">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-900 bg-opacity-75 flex justify-center items-center rounded-lg z-10">
          <Loader
            size={32}
            className="animate-spin text-gray-900 dark:text-white"
          />
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2">
        {isSignUp ? "Sign Up" : "Sign In"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone Input */}
        <div>
          <label className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 flex items-center gap-1">
            Phone <Phone size={16} />
          </label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="Example: 050-1234567"
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline ${
              isLoading ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          />
        </div>

        {/* Name Input (only for Sign Up) */}
        {isSignUp && (
          <div>
            <label className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 flex items-center gap-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Your Name"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline ${
                isLoading
                  ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                  : ""
              }`}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center gap-2 transition-opacity ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isLoading}
        >
          {/* Show loader when loading, otherwise show text/icon */}
          {isLoading ? (
            <Loader size={20} className="animate-spin" />
          ) : (
            <>
              {isSignUp ? "Sign Up" : "Sign In"}
              {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
            </>
          )}
        </button>
      </form>

      {/* Toggle Mode Button */}
      <button
        onClick={handleToggleMode}
        className={`mt-4 w-full text-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1 transition-opacity ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={isLoading}
      >
        {isSignUp ? "Already have an account?" : "Create an account"}
      </button>

      {/* Error Display Area */}
      {localError && (
        <div className="mt-4 text-red-600 dark:text-red-500 text-center flex items-center justify-center gap-1">
          <AlertTriangle size={16} />
          {localError}
        </div>
      )}
    </div>
  );
}

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
