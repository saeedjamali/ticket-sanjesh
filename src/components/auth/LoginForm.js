"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner.jsx";

export default function LoginForm() {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
console.log("Direct Login Page")
    try {
      const response = await fetch("/api/direct-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nationalId,
          password,
          secret: "direct-login-secret",
        }),
        credentials: "include", // Important: This allows cookies to be sent and received
      });

      const data = await response.json();
      console.log("data in login form--->", data);
      if (!response.ok) {
        throw new Error(data.error || data.message || "خطا در ورود به سیستم");
      }

      // Store user data in localStorage for client-side access
      localStorage.setItem("user", JSON.stringify(data.user));

      // Show success message
      setSuccess("ورود موفقیت‌آمیز");

      // Force a full page reload to ensure all cookies are properly set
      window.location.replace(redirectTo);
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">ورود به سیستم</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
          <p className="mt-2 text-sm">در حال انتقال به داشبورد...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nationalId" className="block text-gray-700 mb-2">
            کد ملی
          </label>
          <input
            id="nationalId"
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            disabled={loading}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="کد ملی خود را وارد کنید"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-gray-700 mb-2">
            رمز عبور
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="رمز عبور خود را وارد کنید"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium flex items-center justify-center space-x-2 ${
            loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading && <LoadingSpinner size="sm" className="text-white" />}
          <span>{loading ? "در حال ورود..." : "ورود به سیستم"}</span>
        </button>
      </form>

      {/* <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          راهنما: برای ورود به سیستم از کد ملی <strong>1111111111</strong> و رمز
          عبور <strong>123456</strong> استفاده کنید
        </p>
      </div> */}
    </div>
  );
}
