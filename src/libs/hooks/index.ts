"use client";
import { useEffect, useState } from "react";

export const useLocalStorageState = <T>(
  key: string,
  options?: {
    defaultValue?: T;
  }
) => {
  const [state, setState] = useState<T | null>(null);
  useEffect(() => {
    const data = localStorage.getItem(key);
    if (data !== null) {
      setState(JSON.parse(data) as T);
    } else if (options?.defaultValue !== undefined) {
      setState(options?.defaultValue);
    }
  }, []);
  return [state, setState] as [
    T | null,
    React.Dispatch<React.SetStateAction<T | null>>
  ];
};
