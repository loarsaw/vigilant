import { useEffect, useState } from "react";

export function useTour(storageKey: string) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) setRun(true);
  }, [storageKey]);

  const finish = () => {
    localStorage.setItem(storageKey, "1");
    setRun(false);
  };

  const start = () => setRun(true);

  return { run, start, finish };
}