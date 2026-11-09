import { useState, useEffect, useRef } from 'react';

// useState that persists to localStorage (debounced, flushed on background, and cross-tab synced).
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const latest = useRef(value);
  latest.current = value;

  const write = () => {
    try {
      localStorage.setItem(key, JSON.stringify(latest.current));
    } catch {
      /* storage full or unavailable - ignore */
    }
  };

  useEffect(() => {
    const t = setTimeout(write, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  // Mobile browsers can kill background tabs: save immediately when hidden.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') write();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', write);
    
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', write);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // NEW: Cross-tab synchronization
  // If the user modifies the architecture in another tab, update this tab automatically.
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch {
          // Ignore parsing errors from other tabs
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setValue];
}
