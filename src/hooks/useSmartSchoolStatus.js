"use client";

import { useState, useEffect } from "react";

export function useSmartSchoolStatus(user) {
  const [hasSmartSchoolData, setHasSmartSchoolData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSmartSchoolData = async () => {
      // فقط برای مدیران واحد سازمانی چک کنیم
      if (!user || user.role !== "examCenterManager") {
        setHasSmartSchoolData(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/smart-school");
        if (response.ok) {
          const result = await response.json();
          setHasSmartSchoolData(
            result.success && result.data && result.data.length > 0
          );
        } else {
          setHasSmartSchoolData(false);
        }
      } catch (error) {
        console.error("Error checking smart school data:", error);
        setHasSmartSchoolData(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSmartSchoolData();
  }, [user]);

  return { hasSmartSchoolData, isLoading };
}
