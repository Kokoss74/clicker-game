import React from "react";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/auth";
import {
  Phone,
  UserPlus,
  LogIn,
  AlertTriangle,
  Loader,
  Info, 
} from "lucide-react";
// Assuming react-tooltip is installed or will be added
// If not, we might need to install it or create a custom tooltip
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css"; 

interface AuthFormProps {
  isLoading: boolean;
}

function AuthForm({ isLoading }: AuthFormProps) {
  const { signIn, signUp, error, clearError } = useAuthStore();
  const [isSignUp, setIsSignUp] = React.useState(false); // Initial mode is Sign In
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null); // Local error for display
  const [shouldSwitchToSignUp, setShouldSwitchToSignUp] = React.useState(false);

  // Effect to sync store error to local error and handle auto-switch *to* Sign Up
  React.useEffect(() => {
    if (error) {
      setLocalError(error);
      if (!isSignUp && error === "Invalid login credentials") {
        console.log(
          "AuthForm Effect 1: Invalid credentials detected, setting trigger to switch."
        );
        toast.error("User not registered. Please create an account.");
        setShouldSwitchToSignUp(true);
      }
    } else {
      setLocalError(null);
    }
  }, [error, isSignUp]);

  // Effect 2: Perform the actual switch when the trigger is set
  React.useEffect(() => {
    if (shouldSwitchToSignUp) {
      console.log("AuthForm Effect 2: Executing switch to Sign Up.");
      setIsSignUp(true);
      setShouldSwitchToSignUp(false);
    }
  }, [shouldSwitchToSignUp]);

  // Clear local error on input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setLocalError(null);
    setShouldSwitchToSignUp(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setLocalError(null);
    setShouldSwitchToSignUp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setLocalError(null);
    setShouldSwitchToSignUp(false);
    console.log(
      `AuthForm: Handling submit. Mode: ${isSignUp ? "Sign Up" : "Sign In"}`
    );

    if (isSignUp) {
      if (name.trim().length < 3) {
        console.warn("AuthForm: Sign up validation failed - name too short.");
        setLocalError("Name too short");
        return;
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
    setLocalError(null);
    setShouldSwitchToSignUp(false);
    clearError();
    setPhone("");
    setName("");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative text-gray-900 dark:text-white transition-colors duration-200">
      {/* Loading Overlay */}
      {isLoading && (
        <div
          data-testid="loading-overlay" // Add test ID
          className="absolute inset-0 bg-gray-200 dark:bg-gray-900 bg-opacity-75 flex justify-center items-center rounded-lg z-10"
        >
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
        {/* Phone Input with Help Icon */}
        <div>
          <label className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 flex items-center gap-1">
            Phone <Phone size={16} />
            {/* Help Icon and Tooltip */}
            <span data-tooltip-id="phone-tooltip" data-tooltip-content="Israeli formats: 0501234567 or +972501234567" className="ml-1">
              <Info size={16} className="text-gray-500 dark:text-gray-400" />
            </span>
            <Tooltip
              id="phone-tooltip"
              place="bottom"
              className="!bg-gray-700 !text-white dark:!bg-gray-200 dark:!text-gray-900" // Use Tailwind classes for styling
            />
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
              {/* Name Help Icon and Tooltip */}
              <span data-tooltip-id="name-tooltip" data-tooltip-content="At least 3 characters" className="ml-1">
                <Info size={16} className="text-gray-500 dark:text-gray-400" />
              </span>
              <Tooltip
                id="name-tooltip"
                place="bottom"
                className="!bg-gray-700 !text-white dark:!bg-gray-200 dark:!text-gray-900"
              />
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
          data-testid="submit-button" // Add test ID
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center gap-2 transition-opacity ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isLoading}
        >
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

export default AuthForm;