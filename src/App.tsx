import React, { useEffect, useState } from "react";
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
import Game from "./components/Game";
import { Phone, UserPlus, LogIn, AlertTriangle, Loader } from 'lucide-react'; // Import icons

function AuthForm() {
  const { signIn, signUp, error } = useAuthStore();
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Track invalid credentials error and sync local error
  React.useEffect(() => {
    setLocalError(error);

    if (error === "Invalid login credentials") {
      console.log("AuthForm Effect: Invalid credentials detected, switching to sign up."); // Logging switch
      // Show toast message
      toast.error("User not registered. Please create an account.");
      // Switch to registration mode
      setIsSignUp(true);
    }
  }, [error]);

  // Clear error on input field change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setLocalError(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`AuthForm: Handling submit. Mode: ${isSignUp ? "Sign Up" : "Sign In"}`); // Logging submit start

    if (isSignUp) {
      // Check minimum name length
      if (name.trim().length < 3) {
        console.warn("AuthForm: Sign up validation failed - name too short."); // Logging validation fail
        setLocalError("Name must be at least 3 characters long");
        return;
      }
      console.log("AuthForm: Calling signUp with phone:", phone, "name:", name); // Logging signUp call
      await signUp({ phone, name });
    } else {
      console.log("AuthForm: Calling signIn with phone:", phone); // Logging signIn call
      await signIn({ phone });
    }
    console.log("AuthForm: Submit handler finished."); // Logging submit end
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-white flex items-center justify-center gap-2">
        {isSignUp ? "Sign Up" : "Sign In"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-bold mb-2 flex items-center gap-1">
            Phone
            <Phone size={16} /> {/* Icon added after text */}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="Example: 050-1234567"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {isSignUp && (
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2 flex items-center gap-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Your Name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center gap-2"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
          {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />} {/* Icon added after text */}
        </button>
      </form>

      <button
        onClick={() => {
          console.log(`AuthForm: Toggling form mode to ${!isSignUp ? "Sign Up" : "Sign In"}`); // Logging mode toggle
          setIsSignUp(!isSignUp);
          setLocalError(null); // Clear error on mode switch
        }}
        className="mt-4 w-full text-center text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
      >
        {isSignUp ? "Already have an account?" : "Create an account"}
      </button>

      {localError && (
        <div className="mt-4 text-red-500 text-center flex items-center justify-center gap-1">
            <AlertTriangle size={16} /> {/* Icon added after text */}
            {localError}
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, loading: authLoading, checkUser } = useAuthStore();
  const { loadSettings, loading: settingsLoading } = useGameStore(); // Restored game store usage
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize the application on load
    const init = async () => {
      // console.log("App Effect init: Calling checkUser and loadSettings..."); // Removed noisy log
      await Promise.all([
        checkUser(),
        loadSettings(), // Restored loadSettings call
      ]);
      setInitialized(true);
      console.log("App Effect init: Initialization complete."); // Logging init complete
    };

    init();
    // console.log("App Effect: Initialization process started."); // Removed noisy log
  }, []); // Removed checkUser from dependencies as it's stable

  // Consider both auth and settings loading state
  const isLoading = authLoading || settingsLoading || !initialized;

  // console.log(`App: Current loading state: isLoading=${isLoading} (auth=${authLoading}, settings=${settingsLoading}, initialized=${initialized})`); // Removed noisy log
  if (isLoading) {
    // console.log("App: Rendering Loading screen."); // Removed noisy log
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <div className="text-xl flex items-center gap-2">
            Loading...
            <Loader size={24} className="animate-spin" /> {/* Icon added after text */}
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="min-h-screen bg-gray-900">
        {!user ? (
          (() => { // IIFE to allow statement before expression
            // console.log("App: Rendering AuthForm (no user)."); // Removed noisy log
            return (
              <div className="flex justify-center items-center min-h-screen">
                <AuthForm />
              </div>
            );
          })()
        ) : (
          (() => { // IIFE to allow statement before expression
            // console.log("App: Rendering Game component (user exists)."); // Removed noisy log
            return (
              <Routes>
                <Route path="/" element={<Game />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            );
          })()
        )}
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      </div>
    </Router>
  );
}

export default App;
