"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentsPage from "../page";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import PhoneVerificationGuard from "@/components/PhoneVerificationGuard";

export default function CurrentStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/check-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "خطا در بررسی دسترسی");
        setLoading(false);
        return;
      }

      if (!data.data.isPreviousYearComplete) {
        setError(
          `برای دسترسی به لیست دانش‌آموزان سال تحصیلی ${data.data.currentYear.name}، باید اطلاعات تمام ${data.data.previousYear.totalStudents} دانش‌آموز سال تحصیلی ${data.data.previousYear.name} را ثبت کرده باشید. تا کنون اطلاعات ${data.data.previousYear.registeredStudents} دانش‌آموز ثبت شده است.`
        );
      } else {
        // ذخیره آمار سال جاری
        setStats(data.data.currentYear);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking access:", error);
      setError("خطا در بررسی دسترسی");
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard/students/previous")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              رفتن به لیست دانش‌آموزان سال قبل
            </button>
            <button
              disabled
              onClick={() => router.push("/dashboard/tickets/create")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              ارسال تیکت به مدیر سیستم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PhoneVerificationGuard requiresVerification={true}>
      <StudentsPage
        defaultAcademicYear="current"
        hideAcademicYearFilter={true}
        maxStudents={stats?.totalStudents}
        currentStudentCount={stats?.registeredStudents}
        disableCapacityControl={true}
      />
    </PhoneVerificationGuard>
  );
}
