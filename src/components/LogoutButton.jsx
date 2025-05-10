"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // ریدایرکت به صفحه ورود
        router.push("/login");
        router.refresh();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      // console.error("Logout error:", error);
      toast.error("خطا در خروج از سیستم");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="btn-responsive text-red-600 hover:bg-red-50 rounded-lg transition-all"
      aria-label="خروج از سیستم"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5 btn-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3h15.75"
        />
      </svg>
      <span className="btn-text">خروج</span>
    </button>
  );
} 