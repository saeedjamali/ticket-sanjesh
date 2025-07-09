"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function StudentInfoForm() {
  const [formData, setFormData] = useState({
    studentName: "",
    nationalId: "",
    birthDate: "",
    parentPhone: "",
    address: "",
    grade: "",
    field: "",
    school: "",
    district: "",
    examCenter: "",
    specialNeeds: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      // اینجا پیاده سازی ارسال داده ها انجام خواهد شد
      console.log("Student Info Data:", formData);

      // شبیه سازی درخواست
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSubmitMessage("اطلاعات با موفقیت ذخیره شد");

      // پاک کردن فرم
      setFormData({
        studentName: "",
        nationalId: "",
        birthDate: "",
        parentPhone: "",
        address: "",
        grade: "",
        field: "",
        school: "",
        district: "",
        examCenter: "",
        specialNeeds: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitMessage("خطا در ذخیره اطلاعات");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* اطلاعات شخصی دانش آموز */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">
          اطلاعات شخصی دانش آموز
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              کد ملی
            </label>
            <input
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleInputChange}
              maxLength="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              تاریخ تولد
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              شماره تماس والدین
            </label>
            <input
              type="tel"
              name="parentPhone"
              value={formData.parentPhone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 text-right mb-2">
            آدرس
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            required
          />
        </div>
      </div>

      {/* اطلاعات تحصیلی */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">
          اطلاعات تحصیلی
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              پایه تحصیلی
            </label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            >
              <option value="">انتخاب کنید</option>
              <option value="10">دهم</option>
              <option value="11">یازدهم</option>
              <option value="12">دوازدهم</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              رشته تحصیلی
            </label>
            <select
              name="field"
              value={formData.field}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            >
              <option value="">انتخاب کنید</option>
              <option value="math">ریاضی</option>
              <option value="experimental">تجربی</option>
              <option value="humanities">انسانی</option>
              <option value="art">هنر</option>
              <option value="technical">فنی حرفه‌ای</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              نام مدرسه
            </label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              منطقه آموزشی
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              required
            />
          </div>
        </div>
      </div>

      {/* اطلاعات مرکز آزمون */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">
          اطلاعات مرکز آزمون
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-2">
            مرکز آزمون
          </label>
          <input
            type="text"
            name="examCenter"
            value={formData.examCenter}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            required
          />
        </div>
      </div>

      {/* اطلاعات تکمیلی */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">
          اطلاعات تکمیلی
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              نیازهای ویژه (در صورت وجود)
            </label>
            <textarea
              name="specialNeeds"
              value={formData.specialNeeds}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              placeholder="مثال: نیاز به عینک، کم‌شنوایی، ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              یادداشت‌ها
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              placeholder="سایر توضیحات..."
            />
          </div>
        </div>
      </div>

      {/* پیام وضعیت */}
      {submitMessage && (
        <div
          className={`p-4 rounded-md text-right ${
            submitMessage.includes("موفقیت")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {submitMessage}
        </div>
      )}

      {/* دکمه ارسال */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner />
              <span className="mr-2">در حال ارسال...</span>
            </>
          ) : (
            "ذخیره اطلاعات"
          )}
        </button>
      </div>
    </form>
  );
}
