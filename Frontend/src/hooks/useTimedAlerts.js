import { useEffect, useState } from "react";

const DEFAULT_ALERT_DURATION_MS = 2000;

export function useTimedAlerts(duration = DEFAULT_ALERT_DURATION_MS) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!error) return undefined;

    const timeoutId = window.setTimeout(() => {
      setError("");
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [duration, error]);

  useEffect(() => {
    if (!success) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [duration, success]);

  return {
    error,
    success,
    setError,
    setSuccess
  };
}
