import { useCallback, useEffect, useState } from 'react';
import { api } from './client';

type State<T> = { data: T | null; loading: boolean; error: string | null };

// Small fetch-on-mount hook with pull-to-refresh support. Pass null path to skip.
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

  return { ...state, refetch: load };
}
