import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8080/api';

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export const useApi = <T>(endpoint: string) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prevState) => ({ ...prevState, isLoading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({ data: null, isLoading: false, error: error as Error });
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const post = async (body: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // After a successful post, refetch the data to update the list
      fetchData();
    } catch (error) {
      console.error('Failed to post data:', error);
      // Optionally, you could set an error state here
    }
  };

  return { ...state, post, refetch: fetchData };
};
