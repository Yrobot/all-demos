"use client";
import { useEffect, useState, useCallback } from "react";

export const useLocalStorageState = <T>(
  key: string,
  options?: {
    defaultValue?: T;
  }
) => {
  const [state, _setState] = useState<T | null>(null);
  useEffect(() => {
    const data = localStorage.getItem(key);
    if (data !== null) {
      _setState(JSON.parse(data) as T);
    } else if (options?.defaultValue !== undefined) {
      _setState(options?.defaultValue);
    }
  }, []);

  const setState = useCallback(
    (value: T | null) => {
      _setState(value);
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [_setState]
  );

  return [state, setState] as [T | null, (value: T | null) => void];
};
