import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data whenever the screen gains focus. Keeps the previous data visible
 * while refetching so returning to a tab doesn't flash a spinner.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  // Always call the latest loader; refetch when `deps` change or the screen refocuses.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });
  const depsKey = JSON.stringify(deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loaderRef.current();
      if (alive.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      reload();
      return () => {
        alive.current = false;
      };
      // depsKey isn't read here on purpose: it's the caller's deps, so a change refetches.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, depsKey]),
  );

  return { data, error, loading, reload, setData };
}
