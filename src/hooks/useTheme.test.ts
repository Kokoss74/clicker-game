import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTheme from './useTheme'; // Default export

// Helper to mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  const listeners: (() => void)[] = [];
  return {
    matches: matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(), // Deprecated but used in some libraries
    removeListener: vi.fn(), // Deprecated but used in some libraries
    addEventListener: vi.fn((event, listener) => {
      if (event === 'change') {
        listeners.push(listener as () => void);
      }
    }),
    removeEventListener: vi.fn((event, listener) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener as () => void);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn(),
    // Custom method to simulate change event
    simulateChange: (newMatches: boolean) => {
      if (newMatches !== mockMatchMedia.matches) {
         mockMatchMedia.matches = newMatches;
         listeners.forEach(listener => listener());
      }
    },
  };
};

// Global mock for matchMedia
let mockMatchMedia = createMatchMediaMock(false); // Default to light mode

describe('useTheme hook', () => {
  const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  const matchMediaSpy = vi.spyOn(window, 'matchMedia');

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    // Reset matchMedia mock to default (light)
    mockMatchMedia = createMatchMediaMock(false);
    matchMediaSpy.mockImplementation((query) => {
       if (query === '(prefers-color-scheme: dark)') {
           return mockMatchMedia as unknown as MediaQueryList;
       }
       // Provide a default mock for other queries if necessary
       return createMatchMediaMock(false) as unknown as MediaQueryList;
    });
  });

   afterEach(() => {
     // Ensure classes are removed after tests
     document.documentElement.classList.remove('light', 'dark');
   });

  it('should initialize with "system" theme if localStorage is empty', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
    expect(getItemSpy).toHaveBeenCalledWith('theme');
    // Initial applyTheme based on system (light by default mock)
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should initialize with theme from localStorage if present', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(getItemSpy).toHaveBeenCalledWith('theme');
    // Initial applyTheme based on stored theme
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('should initialize with "system" theme and apply dark if system prefers dark', () => {
     mockMatchMedia = createMatchMediaMock(true); // System prefers dark
     matchMediaSpy.mockImplementation(() => mockMatchMedia as unknown as MediaQueryList);

     const { result } = renderHook(() => useTheme());
     expect(result.current.theme).toBe('system');
     expect(document.documentElement.classList.contains('dark')).toBe(true);
     expect(document.documentElement.classList.contains('light')).toBe(false);
  });


  it('setTheme should update theme state, localStorage, and apply class', () => {
    const { result } = renderHook(() => useTheme());

    // Set to light
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Set to dark
    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');
    expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);

     // Set to system (defaults to light in this mock setup)
     act(() => {
       result.current.setTheme('system');
     });
     expect(result.current.theme).toBe('system');
     expect(setItemSpy).toHaveBeenCalledWith('theme', 'system');
     expect(document.documentElement.classList.contains('light')).toBe(true);
     expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply correct theme class when theme is "system" and system preference changes', () => {
     // Start with system preferring light
     const { result } = renderHook(() => useTheme());
     act(() => {
       result.current.setTheme('system');
     });
     expect(result.current.theme).toBe('system');
     expect(document.documentElement.classList.contains('light')).toBe(true); // Initial is light

     // Simulate system change to dark
     act(() => {
       mockMatchMedia.simulateChange(true);
     });
     // Should re-apply theme based on new system preference
     expect(document.documentElement.classList.contains('dark')).toBe(true);
     expect(document.documentElement.classList.contains('light')).toBe(false);

     // Simulate system change back to light
     act(() => {
       mockMatchMedia.simulateChange(false);
     });
     expect(document.documentElement.classList.contains('light')).toBe(true);
     expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

   it('should add/remove system theme listener only when theme is "system"', () => {
     const { result, rerender } = renderHook(() => useTheme());

     // Initial theme is 'system', listener should be added
     expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
     expect(mockMatchMedia.removeEventListener).not.toHaveBeenCalled();
     mockMatchMedia.addEventListener.mockClear(); // Clear calls for next check

     // Change theme to 'dark'
     act(() => {
       result.current.setTheme('dark');
     });
     rerender(); // Rerender to trigger effect cleanup/re-run

     // Listener should be removed because theme is no longer 'system'
     expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
     expect(mockMatchMedia.addEventListener).not.toHaveBeenCalled(); // Should not re-add
     mockMatchMedia.removeEventListener.mockClear();

     // Change theme back to 'system'
     act(() => {
       result.current.setTheme('system');
     });
     rerender();

     // Listener should be added again
     expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
     expect(mockMatchMedia.removeEventListener).not.toHaveBeenCalled(); // Should not remove yet
   });

    it('should clean up system theme listener on unmount', () => {
      const { result, unmount } = renderHook(() => useTheme());

      // Set theme to system to ensure listener is active
      act(() => {
        result.current.setTheme('system');
      });
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledTimes(1); // Initial + setSystem

      unmount();

      // Check if removeEventListener was called during cleanup
      expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

});