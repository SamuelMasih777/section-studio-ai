import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of silence. Suitable for search inputs where you want to avoid triggering
 * heavy re-computations on every keystroke.
 *
 * Example:
 *   const debouncedQuery = useDebounce(inputValue, 220);
 *   // debouncedQuery only changes 220 ms after the user stops typing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
