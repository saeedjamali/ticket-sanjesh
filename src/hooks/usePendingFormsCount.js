import { useState, useEffect } from "react";

export function usePendingFormsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch("/api/forms/pending-count");
        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching pending forms count:", error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingCount();
  }, []);

  return { count, loading };
}
