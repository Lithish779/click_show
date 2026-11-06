import { useCallback, useEffect, useState } from 'react';

/** Runs an async loader and exposes { data, error, loading, reload }. */
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    let live = true;
    loader().then((data) => live && setState({ data, error: null, loading: false }), (error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run]);
  return { ...state, reload: run };
}
