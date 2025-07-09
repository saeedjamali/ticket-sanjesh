"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { FaSave, FaArrowRight, FaTimes } from "react-icons/fa";

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [helpers, setHelpers] = useState({
    grades: [],
    fields: [],
    genders: [],
    studentTypes: [],
  });

  const [formData, setFormData] = useState({
    nationalId: "",
    firstName: "",
    lastName: "",
    fatherName: "",
    birthDate: "",
    gender: "",
    nationality: "ایرانی",
    mobile: "",
    address: "",
    gradeCode: "",
    fieldCode: "",
    studentType: "normal",
  });

  useEffect(() => {
    fetchHelpers();
    fetchStudent();
  }, [id]);

  const fetchHelpers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/helpers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHelpers(data);
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
    }
  };

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
        // پیش‌بارگذاری فرم با داده‌های دانش‌آموز
        setFormData({
          nationalId: data.student.nationalId || "",
          firstName: data.student.firstName || "",
          lastName: data.student.lastName || "",
          fatherName: data.student.fatherName || "",
          birthDate: data.student.birthDate || "",
          gender: data.student.gender || "",
          nationality: data.student.nationality || "ایرانی",
          mobile: data.student.mobile || "",
          address: data.student.address || "",
          gradeCode: data.student.gradeCode || "",
          fieldCode: data.student.fieldCode || "",
          studentType: data.student.studentType || "normal",
        });
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // پاک کردن پیام‌های قبلی
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("اطلاعات دانش‌آموز با موفقیت بروزرسانی شد");
        setTimeout(() => {
          router.push(`/dashboard/students/${id}`);
        }, 2000);
      } else {
        setError(data.error || "خطا در بروزرسانی اطلاعات");
      }
    } catch (error) {
      console.error("Error updating student:", error);
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!student) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-8">
          <p className="text-red-600">{error || "دانش‌آموز یافت نشد"}</p>
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
            onClick={() => router.push(`/dashboard/students/${id}`)}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowRight className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ویرایش دانش‌آموز
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {student.firstName} {student.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* اطلاعات شخصی */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              اطلاعات شخصی
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد ملی *
                </label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  maxLength="10"
                  pattern="[0-9]{10}"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام خانوادگی *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام پدر *
                </label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاریخ تولد *
                </label>
                <input
                  type="text"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  placeholder="1380/01/01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  جنسیت *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">انتخاب کنید</option>
                  {helpers.genders.map((gender) => (
                    <option key={gender.value} value={gender.value}>
                      {gender.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملیت
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تلفن همراه
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  pattern="09[0-9]{9}"
                  placeholder="09123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* اطلاعات تحصیلی */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              اطلاعات تحصیلی
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  پایه تحصیلی *
                </label>
                <select
                  name="gradeCode"
                  value={formData.gradeCode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">انتخاب کنید</option>
                  {helpers.grades.map((grade) => (
                    <option key={grade.gradeCode} value={grade.gradeCode}>
                      {grade.gradeName} (کد: {grade.gradeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رشته تحصیلی *
                </label>
                <select
                  name="fieldCode"
                  value={formData.fieldCode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">انتخاب کنید</option>
                  {helpers.fields.map((field) => (
                    <option key={field.fieldCode} value={field.fieldCode}>
                      {field.fieldTitle} (کد: {field.fieldCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع دانش‌آموز *
                </label>
                <select
                  name="studentType"
                  value={formData.studentType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {helpers.studentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* آدرس */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
              اطلاعات تماس
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                آدرس
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="آدرس کامل محل سکونت"
              />
            </div>
          </div>

          {/* دکمه‌های عملیات */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <FaSave />
                  ذخیره تغییرات
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/dashboard/students/${id}`)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <FaTimes />
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
