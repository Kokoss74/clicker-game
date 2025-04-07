import React, { useEffect, useState } from 'react'
    import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
    import { ToastContainer, toast } from 'react-toastify'
    import 'react-toastify/dist/ReactToastify.css'
    import { useAuthStore } from './store/auth'
    import { useGameStore } from './store/game' // Restored game store import
    import Game from './components/Game'

    function AuthForm() {
      const { signIn, signUp, error } = useAuthStore();
      const [isSignUp, setIsSignUp] = React.useState(false);
      const [phone, setPhone] = React.useState('');
      const [name, setName] = React.useState('');
      const [localError, setLocalError] = React.useState<string | null>(null);

      // Track invalid credentials error and sync local error
      React.useEffect(() => {
        setLocalError(error);

        if (error === 'Invalid login credentials') {
          // Show toast message
          toast.error('User not registered. Please create an account.');
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

        if (isSignUp) {
          // Check minimum name length
          if (name.trim().length < 3) {
            setLocalError('Name must be at least 3 characters long');
            return;
          }
          await signUp({ phone, name });
        } else {
          await signIn({ phone });
        }
      };

      return (
        <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Phone
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
                <label className="block text-gray-300 text-sm font-bold mb-2">
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 w-full text-center text-blue-400 hover:text-blue-300"
          >
            {isSignUp ? 'Already have an account?' : 'Create an account'}
          </button>

          {localError && (
            <div className="mt-4 text-red-500 text-center">
              {localError}
            </div>
          )}
        </div>
      );
    }

    function App() {
      const { user, loading: authLoading, checkUser } = useAuthStore()
      const { loadSettings, loading: settingsLoading } = useGameStore() // Restored game store usage
      const [initialized, setInitialized] = useState(false)

      useEffect(() => {
        // Initialize the application on load
        const init = async () => {
          await Promise.all([
            checkUser(),
            loadSettings() // Restored loadSettings call
          ])
          setInitialized(true)
        }

        init()
      }, []) // Removed checkUser from dependencies as it's stable

      // Consider both auth and settings loading state
      const isLoading = authLoading || settingsLoading || !initialized;

      if (isLoading) {
        return (
          <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
            <div className="text-xl">Loading...</div>
          </div>
        )
      }

      return (
        <Router>
          <div className="min-h-screen bg-gray-900">
            {!user ? (
              <div className="flex justify-center items-center min-h-screen">
                <AuthForm />
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Game />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />
          </div>
        </Router>
      )
    }

    export default App