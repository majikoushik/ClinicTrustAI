/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect, useRef } from 'react';

export default function useAsync(
  asyncFunction,
  dependencies = [],
  immediate = true,
  initialData = null
) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(immediate ? 'pending' : 'idle');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    if (isMounted.current) {
      setLoading(true);
      setStatus('pending');
      setError(null);
    }

    try {
      const result = await asyncFunction(...args);
      if (isMounted.current) {
        setData(result);
        setStatus('success');
      }
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err);
        setStatus('error');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    if (isMounted.current) {
      setData(initialData);
      setLoading(false);
      setError(null);
      setStatus('idle');
    }
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    status,
    execute,
    reset,
    setData,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  };
}
