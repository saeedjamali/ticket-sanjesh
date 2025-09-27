"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  FaTimes,
  FaHistory,
  FaClock,
  FaUser,
  FaCheck,
  FaTimes as FaReject,
  FaEdit,
  FaPlus,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaSpinner,
} from "react-icons/fa";

export default function StatusTimelineModal({
  isOpen,
  onClose,
  specId,
  specInfo,
}) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && specId) {
      fetchTimeline();
    }
  }, [isOpen, specId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/transfer-applicant-specs/${specId}/timeline`
      );
      const data = await response.json();

      if (data.success) {
        setTimeline(data.timeline);
      } else {
        toast.error(data.error || "خطا در دریافت تاریخچه");
      }
    } catch (error) {
      console.error("Error fetching timeline:", error);
      toast.error("خطا در دریافت تاریخچه");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "created":
        return <FaPlus className="h-4 w-4 text-green-600" />;
      case "approval":
        return <FaCheck className="h-4 w-4 text-green-600" />;
      case "rejection":
        return <FaReject className="h-4 w-4 text-red-600" />;
      case "review":
        return <FaEye className="h-4 w-4 text-blue-600" />;
      case "updated":
        return <FaEdit className="h-4 w-4 text-yellow-600" />;
      case "activated":
        return <FaToggleOn className="h-4 w-4 text-green-600" />;
      case "deactivated":
        return <FaToggleOff className="h-4 w-4 text-red-600" />;
      case "status_change":
      default:
        return <FaHistory className="h-4 w-4 text-blue-600" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case "created":
      case "approval":
      case "activated":
        return "border-green-200 bg-green-50";
      case "rejection":
      case "deactivated":
        return "border-red-200 bg-red-50";
      case "review":
      case "status_change":
        return "border-blue-200 bg-blue-50";
      case "updated":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getActionTypeText = (actionType) => {
    switch (actionType) {
      case "created":
        return "ایجاد";
      case "approval":
        return "تایید";
      case "rejection":
        return "رد";
      case "review":
        return "بررسی";
      case "updated":
        return "ویرایش";
      case "activated":
        return "فعال‌سازی";
      case "deactivated":
        return "غیرفعال‌سازی";
      case "status_change":
        return "تغییر وضعیت";
      default:
        return "نامشخص";
    }
  };

  // تابع ترجمه وضعیت‌ها به فارسی
  const getStatusText = (status) => {
    const statusMap = {
      // وضعیت‌های درخواست
      user_no_action: "فاقد درخواست تجدیدنظر",
      awaiting_user_approval: "درخواست ناقص است",
      user_approval: "در انتظار بررسی مبدأ",
      source_review: "درحال بررسی مشمولیت",
      exception_eligibility_rejection: "فاقد شرایط (عدم احراز مشمولیت)",
      exception_eligibility_approval: "تایید مشمولیت، نظر مبدأ نامشخص",
      source_rejection: "مخالفت مبدا بدلیل کمبود نیرو",
      temporary_transfer_approved: "موافقت با انتقال موقت",
      permanent_transfer_approved: "موافقت با انتقال دائم",
      province_review: "درحال بررسی توسط اداره کل",
      invalid_request: "درخواست نامعتبر است",
      destination_correction_approved: "موافقت با اصلاح مقصد",
      processing_stage_results: "مطابق نتایج مرحله پردازشی",

      // وضعیت‌های انتقال
      no_transfer: "بدون انتقال",
      temporary_transfer: "انتقال موقت",
      permanent_transfer: "انتقال دائم",
      transfer_pending: "انتقال در انتظار",
      transfer_approved: "انتقال تایید شده",
      transfer_rejected: "انتقال رد شده",
      transfer_completed: "انتقال تکمیل شده",

      // سایر وضعیت‌ها
      active: "فعال",
      inactive: "غیرفعال",
      suspended: "تعلیق",
      terminated: "خاتمه یافته",
    };

    return statusMap[status] || status;
  };

  // تابع ترجمه کلیدهای metadata
  const getMetadataKeyText = (key) => {
    const keyMap = {
      originalStatus: "وضعیت قبلی",
      newStatus: "وضعیت جدید",
      changedByRole: "نقش تغییر دهنده",
      updateMethod: "روش بروزرسانی",
      updatedFields: "فیلدهای ویرایش شده",
      reason: "دلیل",
      comment: "توضیحات",
      step: "مرحله",
      actionType: "نوع عملیات",
      userAgent: "مرورگر",
      ipAddress: "آی‌پی",
      previousValue: "مقدار قبلی",
      newValue: "مقدار جدید",
      fieldName: "نام فیلد",
      changeType: "نوع تغییر",

      // کلیدهای جدید مربوط به سیستم انتقال
      reviewType: "نوع بررسی",
      reviewerRole: "نقش بررسی‌کننده",
      action: "عملیات",
      selectedReasonIds: "شناسه دلایل انتخاب شده",
      userComment: "نظر کاربر",
      finalDecision: "تصمیم نهایی",
      appealRequestId: "شناسه درخواست تجدیدنظر",
      workflowChange: "تغییر گردش کار",
      eligibilityDecision: "تصمیم مشمولیت",
      sourceOpinion: "نظر مبدا",
      provinceReview: "بررسی استان",
      districtReview: "بررسی منطقه",
      personnelCode: "کد پرسنلی",
      nationalId: "کد ملی",
      uploadSource: "منبع بارگذاری",
      rowNumber: "شماره ردیف",
      createdBy: "ایجاد شده توسط",
      creationMethod: "روش ایجاد",
      excel_upload: "بارگذاری اکسل",
      manual_entry: "ورود دستی",
      api_import: "وارد کردن از API",
      system_generated: "تولید شده توسط سیستم",

      // ترجمه مقادیر رایج
      true: "بله",
      false: "خیر",
      excel: "اکسل",
      manual: "دستی",
      auto: "خودکار",
      system: "سیستم",
    };
    return keyMap[key] || key;
  };

  // تابع ترجمه مقادیر metadata
  const getMetadataValueText = (key, value) => {
    if (value === null || value === undefined) {
      return "خالی";
    }

    // ترجمه مقادیر خاص
    const valueMap = {
      // مقادیر بولین
      true: "بله",
      false: "خیر",

      // روش‌های ایجاد و بارگذاری
      excel_upload: "بارگذاری اکسل",
      manual_entry: "ورود دستی",
      api_import: "وارد کردن از API",
      system_generated: "تولید شده توسط سیستم",
      excel: "اکسل",
      manual: "دستی",
      auto: "خودکار",
      system: "سیستم",

      // نوع بررسی
      individual_reason_review: "بررسی دلایل فردی",
      final_eligibility_review: "بررسی نهایی مشمولیت",
      source_opinion: "نظر مبدا",
      document_review: "بررسی مستندات",

      // نقش‌های کاربری
      districtTransferExpert: "کارشناس منطقه",
      provinceTransferExpert: "کارشناس استان",
      systemAdmin: "مدیر سیستم",
      transferApplicant: "متقاضی انتقال",

      // عملیات‌ها
      approve: "تایید",
      reject: "رد",
      review: "بررسی",
      submit: "ارسال",
      update: "به‌روزرسانی",
    };

    // بررسی مقدار در نقشه ترجمه
    if (valueMap[String(value)]) {
      return valueMap[String(value)];
    }

    // اگر کلید مربوط به وضعیت است، ترجمه کن
    if (
      key.toLowerCase().includes("status") ||
      key === "originalStatus" ||
      key === "newStatus"
    ) {
      return getStatusText(value);
    }

    // اگر کلید مربوط به نقش است، ترجمه کن
    if (key.toLowerCase().includes("role")) {
      return valueMap[String(value)] || value;
    }

    // اگر آرایه است، عناصر را جدا کن
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // اگر آبجکت است، JSON string کن
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    // سایر موارد
    return String(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FaHistory className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">تاریخچه فرآیند انتقال</h2>
                {specInfo && (
                  <p className="text-blue-100 text-sm">
                    {specInfo.firstName} {specInfo.lastName} - کد پرسنلی:{" "}
                    {specInfo.personnelCode}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <FaSpinner className="h-6 w-6 animate-spin" />
                <span>در حال بارگذاری تاریخچه...</span>
              </div>
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12">
              <FaHistory className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                هیچ رکوردی در تاریخچه وجود ندارد
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry, index) => (
                <div
                  key={entry._id || index}
                  className={`border-2 rounded-lg p-4 ${getActionColor(
                    entry.actionType
                  )} forced-color-bg-white`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(entry.actionType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            {getActionTypeText(entry.actionType)}
                          </h4>
                          {entry.fromStatus && entry.toStatus && (
                            <p className="text-sm text-gray-600 forced-color-text-gray">
                              از &quot;{getStatusText(entry.fromStatus)}&quot;
                              به &quot;
                              {getStatusText(entry.toStatus)}&quot;
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500 forced-color-text-gray flex-shrink-0">
                          <div className="flex items-center gap-1 mb-1">
                            <FaClock className="h-3 w-3" />
                            <span>{formatDate(entry.performedAt)}</span>
                          </div>
                          {entry.performedBy && (
                            <div className="flex items-center gap-1">
                              <FaUser className="h-3 w-3" />
                              <span>
                                {entry.performedBy.fullName || "کاربر سیستم"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Comment */}
                      {entry.comment && (
                        <p className="text-gray-700 mb-3 forced-color-text-black bg-white/60 p-3 rounded-md">
                          {entry.comment}
                        </p>
                      )}

                      {/* Metadata */}
                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 forced-color-text-black">
                              جزئیات بیشتر
                            </summary>
                            <div className="mt-2 p-3 bg-gray-100 rounded-md forced-color-bg-white">
                              <div className="text-xs text-gray-600 forced-color-text-gray space-y-1">
                                {Object.entries(entry.metadata).map(
                                  ([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex justify-between"
                                    >
                                      <span className="font-medium">
                                        {getMetadataKeyText(key)}:
                                      </span>
                                      <span className="text-left">
                                        {getMetadataValueText(key, value)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </details>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end forced-color-bg-white">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
