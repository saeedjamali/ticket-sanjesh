"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaEdit,
  FaArrowRight,
  FaUser,
  FaIdCard,
  FaCalendar,
  FaVenusMars,
  FaGraduationCap,
  FaBook,
  FaPhone,
  FaMapMarkerAlt,
} from "react-icons/fa";

export default function StudentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudent(data.student);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "خطا در دریافت اطلاعات دانش‌آموز");
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
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
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push("/dashboard/students")}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← بازگشت به لیست دانش‌آموزان
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-8">
          <p className="text-gray-500">دانش‌آموز یافت نشد</p>
          <button
            onClick={() => router.push("/dashboard/students")}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← بازگشت به لیست دانش‌آموزان
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/students")}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowRight className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              جزئیات دانش‌آموز
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {student.firstName} {student.lastName}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/students/${id}/edit`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaEdit />
          ویرایش
        </button>
      </div>

      {/* Student Details Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <FaUser className="text-xl" />
            <h2 className="text-lg font-semibold">
              {student.firstName} {student.lastName}
            </h2>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                student.studentType === "normal"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {student.studentTypeName ||
                (student.studentType === "normal" ? "عادی" : "بزرگسال")}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* اطلاعات شخصی */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                اطلاعات شخصی
              </h3>

              <div className="flex items-center gap-3">
                <FaIdCard className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">کد ملی</p>
                  <p className="font-medium">{student.nationalId}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaUser className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">نام پدر</p>
                  <p className="font-medium">{student.fatherName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaCalendar className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">تاریخ تولد</p>
                  <p className="font-medium">{student.birthDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaVenusMars className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">جنسیت</p>
                  <p className="font-medium">
                    {student.genderName ||
                      (student.gender === "male" ? "پسر" : "دختر")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaIdCard className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">ملیت</p>
                  <p className="font-medium">{student.nationality}</p>
                </div>
              </div>
            </div>

            {/* اطلاعات تحصیلی */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                اطلاعات تحصیلی
              </h3>

              <div className="flex items-center gap-3">
                <FaBook className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">دوره تحصیلی</p>
                  <p className="font-medium">
                    {student.courseName || student.academicCourse}
                  </p>
                  {student.branchName && (
                    <p className="text-xs text-gray-500 mt-1">
                      {student.branchName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaGraduationCap className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">پایه تحصیلی</p>
                  <p className="font-medium">
                    {student.gradeName || student.gradeCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    کد: {student.gradeCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaBook className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">رشته تحصیلی</p>
                  <p className="font-medium">
                    {student.fieldName || student.fieldCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    کد: {student.fieldCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaCalendar className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">سال تحصیلی</p>
                  <p className="font-medium">{student.academicYear}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaIdCard className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">کد واحد سازمانی</p>
                  <p className="font-medium">
                    {student.organizationalUnitCode}
                  </p>
                </div>
              </div>
            </div>

            {/* اطلاعات تماس */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                اطلاعات تماس
              </h3>

              {student.mobile && (
                <div className="flex items-center gap-3">
                  <FaPhone className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">تلفن همراه</p>
                    <p className="font-medium">{student.mobile}</p>
                  </div>
                </div>
              )}

              {student.address && (
                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">آدرس</p>
                    <p className="font-medium">{student.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <FaIdCard className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">کد منطقه</p>
                  <p className="font-medium">{student.districtCode}</p>
                </div>
              </div>

              {/* تاریخ ایجاد و بروزرسانی */}
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  تاریخ ثبت:{" "}
                  {new Date(student.createdAt).toLocaleDateString("fa-IR")}
                </p>
                {student.updatedAt &&
                  student.updatedAt !== student.createdAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      آخرین بروزرسانی:{" "}
                      {new Date(student.updatedAt).toLocaleDateString("fa-IR")}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
