"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TestLoginPage() {
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responseDetails, setResponseDetails] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResponseDetails(null);

    try {
      // برای دیباگ، ابتدا سعی میکنیم فقط درخواست را بگیریم بدون پردازش
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
      });

      // بررسی پاسخ خام
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );
      console.log("Raw response text:", responseText);

      // نمایش اطلاعات پاسخ برای دیباگ
      setResponseDetails({
        status: response.status,
        contentType: response.headers.get("content-type"),
        textPreview:
          responseText.substring(0, 150) +
          (responseText.length > 150 ? "..." : ""),
      });

      // اگر پاسخ HTML است، احتمالا خطای سرور است
      if (
        responseText.trim().startsWith("<!DOCTYPE") ||
        responseText.trim().startsWith("<html")
      ) {
        throw new Error(
          "سرور پاسخ HTML برگرداند به جای JSON. احتمالا خطای سرور رخ داده است."
        );
      }

      // سعی در تبدیل به JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        throw new Error("خطا در پردازش پاسخ JSON: " + jsonError.message);
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || "خطا در ورود به سیستم");
      }

      // Login successful
      setSuccess(data.message || "ورود موفقیت آمیز");
      // Store token in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          ورود به سیستم (آزمایشی)
        </h1>

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

        {responseDetails && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-xs overflow-auto max-h-32">
            <p>
              <strong>وضعیت:</strong> {responseDetails.status}
            </p>
            <p>
              <strong>نوع محتوا:</strong> {responseDetails.contentType}
            </p>
            <p>
              <strong>پیش‌نمایش پاسخ:</strong>{" "}
              <code>{responseDetails.textPreview}</code>
            </p>
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
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="رمز عبور خود را وارد کنید"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "در حال ورود..." : "ورود به سیستم"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            راهنما: برای ورود به سیستم از کد ملی <strong>1111111111</strong> و
            رمز عبور <strong>admin123456</strong> استفاده کنید
          </p>
        </div>
      </div>
    </div>
  );
}
