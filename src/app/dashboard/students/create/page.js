"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function CreateStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearFilter = searchParams.get("yearFilter") || "current";
  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

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

  const [helpers, setHelpers] = useState({
    examCenterInfo: null,
    grades: [],
    fields: [],
    genders: [],
    studentTypes: [],
    activeAcademicYear: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchHelpers();
  }, []);

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
        console.log("Helpers data received:", data);
        console.log("ExamCenter info:", data.examCenterInfo);
        console.log("Course info:", data.examCenterInfo?.course);
        console.log("District code:", data.examCenterInfo?.districtCode);
        setHelpers(data);
      } else {
        const errorData = await response.json();
        console.error("Helpers API error:", errorData);
        setSubmitMessage(errorData.error || "خطا در دریافت اطلاعات");
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
      setSubmitMessage("خطا در دریافت اطلاعات");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // پاک کردن خطا هنگام تغییر
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nationalId) {
      newErrors.nationalId = "کد ملی الزامی است";
    } else if (!/^\d{10}$/.test(formData.nationalId) && !/^\d{11}$/.test(formData.nationalId)) {
      newErrors.nationalId = "کد ملی میتواند 10 یا 11 رقم باشد";
    }

    if (!formData.firstName) {
      newErrors.firstName = "نام الزامی است";
    }

    if (!formData.lastName) {
      newErrors.lastName = "نام خانوادگی الزامی است";
    }

    if (!formData.fatherName) {
      newErrors.fatherName = "نام پدر الزامی است";
    }

    if (!formData.birthDate) {
      newErrors.birthDate = "تاریخ تولد الزامی است";
    }

    if (!formData.gender) {
      newErrors.gender = "جنسیت الزامی است";
    }

    if (!formData.gradeCode) {
      newErrors.gradeCode = "پایه تحصیلی الزامی است";
    }

    if (!formData.fieldCode) {
      newErrors.fieldCode = "رشته تحصیلی الزامی است";
    }

    if (formData.mobile && !/^09\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = "شماره موبایل نامعتبر است";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitMessage("لطفاً خطاهای فرم را اصلاح کنید");
      return;
    }

    setLoading(true);
    setSubmitMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/students?yearFilter=${yearFilter}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage("دانش‌آموز با موفقیت ایجاد شد");
        setTimeout(() => {
          router.push(`/dashboard/students/${yearFilter}`);
        }, 2000);
      } else {
        setSubmitMessage(data.error || "خطا در ایجاد دانش‌آموز");
      }
    } catch (error) {
      console.error("Error creating student:", error);
      setSubmitMessage("خطا در ایجاد دانش‌آموز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/students/${yearFilter}`)}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ثبت دانش‌آموز جدید
            </h1>
            {helpers.activeAcademicYear && (
              <p className="text-sm text-gray-600 mt-1">
                سال تحصیلی: {helpers.activeAcademicYear}
              </p>
            )}
            {helpers.examCenterInfo && (
              <div className="text-sm text-gray-600 mt-2">
                <p>واحد سازمانی: {helpers.examCenterInfo.name}</p>
                <p>کد: {helpers.examCenterInfo.code}</p>
                <p>
                  دوره: {helpers.examCenterInfo.course.courseName} - شاخه:{" "}
                  {helpers.examCenterInfo.branch.branchTitle}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* اطلاعات شخصی */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              اطلاعات شخصی
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد ملی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  maxLength="10"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nationalId ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="10 رقم"
                />
                {errors.nationalId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.nationalId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام خانوادگی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام پدر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fatherName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.fatherName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.fatherName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاریخ تولد (فارسی) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.birthDate ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="مثال: 1385/05/15"
                />
                {errors.birthDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.birthDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  جنسیت <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.gender ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="male">پسر</option>
                  <option value="female">دختر</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                )}
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
                  placeholder="ایرانی"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره موبایل
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.mobile ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="09123456789"
                />
                {errors.mobile && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                آدرس
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* اطلاعات تحصیلی */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              اطلاعات تحصیلی
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  دوره تحصیلی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={helpers.examCenterInfo?.course.courseName || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  دوره تحصیلی بر اساس واحد سازمانی شما تعین شده است
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد واحد سازمانی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={helpers.examCenterInfo?.code || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  کد واحد سازمانی شما
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد منطقه <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={helpers.examCenterInfo?.districtCode || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  کد منطقه واحد سازمانی شما
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  پایه تحصیلی <span className="text-red-500">*</span>
                </label>
                <select
                  name="gradeCode"
                  value={formData.gradeCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.gradeCode ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">انتخاب کنید</option>
                  {helpers.grades.map((grade) => (
                    <option key={grade.gradeCode} value={grade.gradeCode}>
                      {grade.gradeName}
                    </option>
                  ))}
                </select>
                {errors.gradeCode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.gradeCode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رشته تحصیلی <span className="text-red-500">*</span>
                </label>
                <select
                  name="fieldCode"
                  value={formData.fieldCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fieldCode ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">انتخاب کنید</option>
                  {helpers.fields.map((field) => (
                    <option key={field.fieldCode} value={field.fieldCode}>
                      {field.fieldTitle}
                    </option>
                  ))}
                </select>
                {errors.fieldCode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.fieldCode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع دانش‌آموز <span className="text-red-500">*</span>
                </label>
                <select
                  name="studentType"
                  value={formData.studentType}
                  onChange={handleInputChange}
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

          {/* پیام */}
          {submitMessage && (
            <div
              className={`p-4 rounded-md ${
                submitMessage.includes("موفقیت")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {submitMessage}
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push("/dashboard/students")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  در حال ذخیره...
                </>
              ) : (
                "ذخیره دانش‌آموز"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
