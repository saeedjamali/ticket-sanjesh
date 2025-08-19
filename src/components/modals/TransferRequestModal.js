import { useState } from "react";
import {
  FaTimes,
  FaExchangeAlt,
  FaInfoCircle,
  FaSpinner,
} from "react-icons/fa";
import toast from "react-hot-toast";

export default function TransferRequestModal({
  isOpen,
  onClose,
  academicYear,
}) {
  const [formData, setFormData] = useState({
    studentNationalId: "",
    requestDescription: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.studentNationalId.trim()) {
      toast.error("لطفا کد ملی دانش‌آموز را وارد کنید");
      return;
    }

    if (!formData.requestDescription.trim()) {
      toast.error("لطفا توضیحات درخواست را وارد کنید");
      return;
    }

    // اعتبارسنجی کد ملی
    if (
      formData.studentNationalId.length !== 10 ||
      !/^\d+$/.test(formData.studentNationalId)
    ) {
      toast.error("کد ملی باید ۱۰ رقم باشد");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transfer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentNationalId: formData.studentNationalId,
          academicYear: academicYear,
          requestDescription: formData.requestDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setFormData({
          studentNationalId: "",
          requestDescription: "",
        });
        onClose();
      } else {
        toast.error(result.error || "خطا در ثبت درخواست");
      }
    } catch (error) {
      console.error("Error submitting transfer request:", error);
      toast.error("خطا در ارسال درخواست");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaExchangeAlt className="text-blue-600 text-xl" />
            <h2 className="text-xl font-bold text-gray-900">
              درخواست جابجایی دانش‌آموز
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* راهنما */}
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-2">
              <h3 className="font-semibold mb-2">راهنمای استفاده:</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  این قابلیت برای دانش‌آموزانی است که در مدرسه دیگری ثبت‌نام
                  کرده‌اند اما باید در مدرسه شما باشند
                </li>
                <li>
                  کد ملی دانش‌آموزی را وارد کنید که خطای &quot;وجود دارد&quot;
                  را دریافت کرده‌اید
                </li>
                <li>
                  درخواست شما به مدیر مدرسه‌ای که دانش‌آموز در آنجا ثبت‌نام است
                  ارسال می‌شود
                </li>
                <li>در صورت تایید، دانش‌آموز به مدرسه شما منتقل خواهد شد</li>
                <li>نتیجه درخواست از طریق پیام به شما اطلاع داده خواهد شد</li>
              </ul>
            </div>
          </div>
        </div>

        {/* فرم */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* سال تحصیلی */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سال تحصیلی
              </label>
              <input
                type="text"
                value={academicYear}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            {/* کد ملی دانش‌آموز */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                کد ملی دانش‌آموز <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="studentNationalId"
                value={formData.studentNationalId}
                onChange={handleInputChange}
                placeholder="۱۰ رقم کد ملی دانش‌آموز"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                کد ملی دانش‌آموزی که خطای تکراری بودن داده است
              </p>
            </div>

            {/* توضیحات درخواست */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توضیحات درخواست <span className="text-red-500">*</span>
              </label>
              <textarea
                name="requestDescription"
                value={formData.requestDescription}
                onChange={handleInputChange}
                rows={4}
                placeholder="دلیل درخواست جابجایی و توضیحات اضافی..."
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  دلیل درخواست و توضیحات اضافی برای مدیر مدرسه مقصد
                </p>
                <span className="text-xs text-gray-400">
                  {formData.requestDescription.length}/1000
                </span>
              </div>
            </div>

            {/* هشدار */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">توجه:</p>
                  <p>
                    این درخواست به مدیر مدرسه‌ای که دانش‌آموز در آنجا ثبت‌نام
                    است ارسال می‌شود. لطفا توضیحات کاملی از دلیل درخواست ارائه
                    دهید.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                <>
                  <FaExchangeAlt />
                  ارسال درخواست
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
