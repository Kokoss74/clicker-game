import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const useTheme = () => {
  // Initialize state, trying to get theme from localStorage or default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'system'; // Default for SSR or environments without window
    }
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    return storedTheme || 'system';
  });

  // Function to apply the theme class to the documentElement
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark'); // Remove previous theme classes

    let effectiveTheme: 'light' | 'dark';
    if (newTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = newTheme;
    }

    root.classList.add(effectiveTheme); // Add the current effective theme class
    // console.log(`Applying theme: ${effectiveTheme} (requested: ${newTheme})`); // Debug log
  }, []);

  // Effect to apply theme on initial load and when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Effect to listen for system theme changes if theme is 'system'
  useEffect(() => {
    if (theme !== 'system') {
      return; // Only listen if theme is set to 'system'
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // console.log('System theme changed, reapplying theme.'); // Debug log
      applyTheme('system'); // Re-apply to reflect the change
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]); // Rerun if theme changes to/from 'system'

  // Function to update theme state and localStorage
  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  return { theme, setTheme };
};

export default useTheme;