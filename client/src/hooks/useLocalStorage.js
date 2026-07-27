import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for working with localStorage
 * 
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value
 * @returns {Array} [storedValue, setValue, removeValue]
 */
export default function useLocalStorage(key, initialValue) {
  // Get stored value from localStorage
  const readValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);
  
  // State to store our value
  const [storedValue, setStoredValue] = useState(readValue);
  
  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch a custom event so other instances can update
        window.dispatchEvent(new Event('local-storage'));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  // Remove value from localStorage
  const removeValue = () => {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        // Dispatch a custom event so other instances can update
        window.dispatchEvent(new Event('local-storage'));
      }
      
      // Reset state
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };
  
  // Listen for changes to this localStorage key in other windows/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    
    // Listen for the custom event
    window.addEventListener('local-storage', handleStorageChange);
    
    // Listen for the storage event (for changes in other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('local-storage', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [readValue]);
  
  return [storedValue, setValue, removeValue];
}
