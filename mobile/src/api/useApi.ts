import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from './client';

type State<T> = { data: T | null; loading: boolean; error: string | null };

// Small fetch hook with pull-to-refresh. Loads on mount AND refetches whenever the screen regains
// focus — so returning from a detail/action screen (e.g. after completing or rating an action)
// shows fresh data instead of a stale list. Pass null path to skip.
export function useApi<T = any>(path: string | null, deps: any[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null });

  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get<T>(path);
      setState({ data, loading: false, error: null });
    } catch (e: any) {
      setState({ data: null, loading: false, error: e?.message || 'Something went wrong' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { load(); }, [load]);

  // Refetch on re-focus, skipping the very first focus (that's the mount load above), so we don't
  // double-fetch on first render but always refresh when navigating back to the screen.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) { firstFocus.current = false; return; }
      load();
    }, [load])
  );

  return { ...state, refetch: load };
}
