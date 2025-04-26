"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const initialCheckDone = useRef(false);

  // Check authentication status
  const checkAuth = async () => {
    // اگر قبلاً چک شده، دیگر چک نکن
    if (initialCheckDone.current) return;

    try {
      console.log("Validating token..."); // برای دیباگ
      const response = await fetch("/api/auth/validate-token", {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        if (response.status === 401) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            router.push("/login");
          }
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
      initialCheckDone.current = true; // علامت‌گذاری که چک اولیه انجام شده
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  };

  // Login
  const login = async (userData) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "خطا در ورود به سیستم");
      }

      setUser(data.user);
      initialCheckDone.current = true; // بعد از لاگین موفق، علامت‌گذاری می‌کنیم
      return true;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Logout failed:", response.status);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      initialCheckDone.current = false; // ریست کردن وضعیت چک در زمان خروج
      router.push("/login");
    }
  };

  // Check auth on mount
  useEffect(() => {
    if (!initialCheckDone.current) {
      checkAuth();
    }
  }, []); // فقط یکبار در زمان mount اجرا شود

  // Setup token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (before 15-minute expiry)
    const interval = setInterval(refreshToken, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const contextValue = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    refreshToken,
    isAuthenticated: !!user,
    initialized,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
