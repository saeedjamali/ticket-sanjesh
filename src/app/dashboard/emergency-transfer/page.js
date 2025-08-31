"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  getFieldDisplayName,
  getAllFields,
  getCustomFieldsForCorrection,
} from "@/lib/fieldTranslations";
import {
  FaExclamationTriangle,
  FaPhone,
  FaSpinner,
  FaCheckCircle,
  FaTimes,
  FaShieldAlt,
  FaLock,
  FaArrowRight,
  FaClock,
  FaRedo,
  FaCheck,
  FaUser,
  FaFileAlt,
  FaArrowLeft,
  FaUndo,
  FaClipboardList,
  FaInfoCircle,
  FaTimesCircle,
  FaEdit,
  FaImage,
  FaTrash,
  FaDownload,
  FaPlus,
  FaUserFriends,
  FaUserMd,
  FaHome,
} from "react-icons/fa";

import ChatBox from "@/components/chat/ChatBox";

// کامپوننت نمایش فقط خواندنی درخواست
function ReadOnlyRequestView({ userSpecs, onBack }) {
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);

  // تابع تعیین مراحل workflow بر اساس وضعیت فعلی
  const getWorkflowSteps = (currentStatus) => {
    const baseSteps = [
      {
        status: "user_no_action",
        title: "ثبت اولیه",
        description: "درخواست ایجاد شده",
      },
      {
        status: "awaiting_user_approval",
        title: "درخواست ناقص",
        description: "در انتظار تکمیل توسط کاربر",
      },
      {
        status: "user_approval",
        title: "در انتظار بررسی",
        description: "درخواست توسط کاربر تایید شد",
      },
      {
        status: "source_review",
        title: "در حال بررسی مبدا",
        description: "در حال بررسی توسط منطقه مبدا",
      },
    ];

    // اضافه کردن مراحل بر اساس وضعیت فعلی
    if (currentStatus === "exception_eligibility_rejection") {
      baseSteps.push({
        status: "exception_eligibility_rejection",
        title: "رد مشمولیت (فاقد شرایط)",
        description: "مشمولیت استثنا رد شد",
      });
    } else if (currentStatus === "source_rejection") {
      baseSteps.push({
        status: "source_rejection",
        title: "مخالفت مبدا",
        description: "درخواست توسط منطقه مبدا رد شد",
      });
    } else {
      // اضافه کردن مرحله تایید مشمولیت استثنا (اختیاری)
      if (
        currentStatus === "exception_eligibility_approval" ||
        currentStatus === "source_approval" ||
        currentStatus === "province_review" ||
        currentStatus === "province_approval" ||
        currentStatus === "province_rejection" ||
        currentStatus === "destination_review" ||
        currentStatus === "destination_approval" ||
        currentStatus === "destination_rejection"
      ) {
        baseSteps.push({
          status: "exception_eligibility_approval",
          title: "تایید مشمولیت استثنا",
          description: "مشمولیت استثنا تایید شد",
        });
      }

      baseSteps.push(
        {
          status: "source_approval",
          title: "موافقت مبدا",
          description: "توسط منطقه مبدا تایید شد",
        },
        {
          status: "province_review",
          title: "بررسی استان",
          description: "در حال بررسی توسط استان",
        }
      );

      if (currentStatus === "province_rejection") {
        baseSteps.push({
          status: "province_rejection",
          title: "مخالفت استان",
          description: "درخواست توسط استان رد شد",
        });
      } else {
        baseSteps.push(
          {
            status: "province_approval",
            title: "موافقت استان",
            description: "توسط استان تایید شد",
          },
          // {
          //   status: "destination_review",
          //   title: "بررسی مقصد",
          //   description: "در حال بررسی توسط منطقه مقصد",
          // },
          {
            status: "approved",
            title: "تایید نهایی",
            description: "درخواست به طور کامل تایید شد",
          },
          {
            status: "completed",
            title: "تکمیل",
            description: "فرایند انتقال تکمیل شد",
          }
        );
      }
    }

    return baseSteps;
  };

  // تابع تعیین رنگ بر اساس نوع وضعیت
  const getStatusColorScheme = (status) => {
    if (
      status.includes("approval") ||
      status === "approved" ||
      status === "completed" ||
      status === "user_approval" ||
      status === "exception_eligibility_approval"
    ) {
      return {
        bg: "bg-green-100",
        border: "border-green-300",
        text: "text-green-800",
        icon: "text-green-600",
        dot: "bg-green-500",
      };
    }
    if (
      status.includes("rejection") ||
      status === "rejected" ||
      status === "exception_eligibility_rejection"
    ) {
      return {
        bg: "bg-red-100",
        border: "border-red-300",
        text: "text-red-800",
        icon: "text-red-600",
        dot: "bg-red-500",
      };
    }
    if (
      status.includes("review") ||
      status.includes("awaiting") ||
      status === "under_review" ||
      status === "pending"
    ) {
      return {
        bg: "bg-yellow-100",
        border: "border-yellow-300",
        text: "text-yellow-800",
        icon: "text-yellow-600",
        dot: "bg-yellow-500",
      };
    }
    return {
      bg: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-800",
      icon: "text-blue-600",
      dot: "bg-blue-500",
    };
  };

  // تابع تعیین وضعیت timeline
  const getTimelineStatus = (
    stepStatus,
    currentStatus,
    workflowHistory,
    workflowSteps
  ) => {
    const currentStepIndex = workflowSteps.findIndex(
      (step) => step.status === currentStatus
    );
    const stepIndex = workflowSteps.findIndex(
      (step) => step.status === stepStatus
    );

    // بررسی اینکه آیا این مرحله در تاریخچه انجام شده یا نه
    const hasBeenProcessed = workflowHistory?.some(
      (item) => item.status === stepStatus
    );

    if (hasBeenProcessed) {
      return "completed";
    } else if (stepStatus === currentStatus) {
      return "current";
    } else if (stepIndex < currentStepIndex) {
      return "completed";
    } else {
      return "pending";
    }
  };

  // تابع فرمت تاریخ
  const formatDate = (dateString) => {
    if (!dateString) return "نامشخص";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      return "نامشخص";
    }
  };

  // تابع نمایش نام وضعیت
  const getStatusDisplayName = (status) => {
    const statusMap = {
      user_no_action: "فاقد درخواست تجدیدنظر",
      awaiting_user_approval: "درخواست ناقص",
      user_approval: "در انتظار بررسی",
      source_review: "در حال بررسی مبدا",
      exception_eligibility_approval: "تایید مشمولیت",
      exception_eligibility_rejection: "رد مشمولیت (فاقد شرایط)",
      source_approval: "موافقت مبدا (موقت/دائم)",
      source_rejection: "مخالفت مبدا",
      province_review: "در حال بررسی توسط استان",
      province_approval: "موافقت استان",
      province_rejection: "مخالفت استان",
      // destination_review: "در حال بررسی مقصد",
      destination_approval: "تایید مقصد",
      destination_rejection: "رد مقصد",
    };
    return statusMap[status] || status;
  };

  // تابع نمایش نوع عملیات
  const getActionTypeDisplayName = (actionType) => {
    const actionMap = {
      profile_correction_requested: "درخواست اصلاح مشخصات",
      appeal_request_submitted: "ثبت درخواست تجدید نظر",
      appeal_request_draft: "ذخیره پیش‌نویس درخواست",
      destination_priorities_updated: "به‌روزرسانی اولویت‌های مقصد",
      final_submission: "ارسال نهایی درخواست",
      user_created: "ایجاد کاربر",
      bulk_upload: "بارگذاری دسته‌ای",
      profile_correction_request: "درخواست اصلاح مشخصات",
      profile_correction_request_draft: "ذخیره پیش‌نویس درخواست اصلاح مشخصات",
      profile_correction_request_submitted: "ارسال درخواست اصلاح مشخصات",
      profile_correction_request_rejected: "رد درخواست اصلاح مشخصات",
      profile_correction_request_approved: "تایید درخواست اصلاح مشخصات",
      profile_correction_request_completed: "تکمیل درخواست اصلاح مشخصات",
      profile_correction_request_cancelled: "انصراف از درخواست اصلاح مشخصات",
      profile_correction_request_expired: "انقضای درخواست اصلاح مشخصات",
      appeal_request_draft_save: "ذخیره پیش‌نویس درخواست تجدید نظر",
      appeal_request_draft_submitted: "ارسال درخواست تجدید نظر",
      appeal_request_draft_rejected: "رد درخواست تجدید نظر",
      appeal_request_draft_approved: "تایید درخواست تجدید نظر",
      appeal_request_draft_completed: "تکمیل درخواست تجدید نظر",
      appeal_request_draft_cancelled: "انصراف از درخواست تجدید نظر",
      appeal_request_draft_expired: "انقضای درخواست تجدید نظر",
    };
    return actionMap[actionType] || actionType;
  };

  // دریافت جزئیات کامل درخواست
  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const [specsResponse, appealResponse, districtsResponse] =
          await Promise.all([
            fetch("/api/transfer-applicant/profile-specs", {
              credentials: "include",
            }),
            fetch("/api/transfer-applicant/appeal-request", {
              credentials: "include",
            }),
            fetch("/api/transfer-applicant/districts", {
              credentials: "include",
            }),
          ]);

        const specsData = await specsResponse.json();
        const appealData = await appealResponse.json();
        const districtsData = await districtsResponse.json();

        console.log("Request Details:", {
          specsData,
          appealData,
          districtsData,
        });

        setRequestDetails({
          userSpecs: specsData.success ? specsData.specs : userSpecs,
          appealRequest:
            appealData.success && appealData.appealRequests?.length > 0
              ? appealData.appealRequests[0]
              : null,
          destinationPriorities: specsData.success
            ? Array.from({ length: 7 }, (_, i) => {
                const priority = i + 1;
                const destination =
                  specsData.specs[`destinationPriority${priority}`];
                if (destination) {
                  // پیدا کردن اطلاعات منطقه از لیست مناطق
                  const district = districtsData.success
                    ? districtsData.districts.find(
                        (d) => d.code === destination.districtCode
                      )
                    : null;

                  return {
                    priority,
                    districtCode: destination.districtCode,
                    districtName: district?.name || "نامشخص",
                    provinceName: district?.province?.name || "نامشخص",
                    transferType: destination.transferType,
                  };
                }

                return null;
              }).filter(Boolean)
            : [],
        });
      } catch (error) {
        console.error("Error fetching request details:", error);
        setRequestDetails({
          userSpecs: userSpecs,
          appealRequest: null,
          destinationPriorities: [],
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchRequestDetails();
  }, [userSpecs]);

  // تابع تبدیل نوع انتقال به فارسی
  const getTransferTypeText = (transferType) => {
    const typeMap = {
      permanent_preferred: "دائم یا موقت با اولویت دائم",
      permanent_only: "فقط دائم",
      temporary_only: "فقط موقت",
    };
    return typeMap[transferType] || "دائم یا موقت با اولویت دائم";
  };

  // تابع دریافت رنگ وضعیت
  const getStatusColor = (status) => {
    const colorMap = {
      user_no_action: "bg-gray-100 text-gray-800 border-gray-200",
      awaiting_user_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
      user_approval: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-blue-100 text-blue-800 border-blue-200",
      under_review: "bg-orange-100 text-orange-800 border-orange-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      completed: "bg-purple-100 text-purple-800 border-purple-200",
      source_review: "bg-blue-100 text-blue-800 border-blue-200",
      exception_eligibility_approval:
        "bg-green-100 text-green-800 border-green-200",
      exception_eligibility_rejection: "bg-red-100 text-red-800 border-red-200",
      source_approval: "bg-green-100 text-green-800 border-green-200",
      source_rejection: "bg-red-100 text-red-800 border-red-200",
      province_review: "bg-blue-100 text-blue-800 border-blue-200",
      province_approval: "bg-green-100 text-green-800 border-green-200",
      province_rejection: "bg-red-100 text-red-800 border-red-200",
      destination_review: "bg-blue-100 text-blue-800 border-blue-200",
      destination_approval: "bg-green-100 text-green-800 border-green-200",
      destination_rejection: "bg-red-100 text-red-800 border-red-200",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // تابع دریافت اطلاعات نمایش اعلان وضعیت
  const getStatusNotification = (status) => {
    const notifications = {
      user_approval: {
        bg: "bg-green-50 border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        textColor: "text-green-800",
        textColorSecondary: "text-green-700",
        icon: "FaCheckCircle",
        title: "درخواست شما با موفقیت ثبت و ارسال شده است",
        message: "درخواست شما تایید شده و به مرحله بعد ارسال شده است.",
      },
      source_review: {
        bg: "bg-blue-50 border-blue-200",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        textColor: "text-blue-800",
        textColorSecondary: "text-blue-700",
        icon: "FaClock",
        title: "درخواست شما در حال بررسی توسط منطقه مبدا است",
        message: "لطفاً منتظر نتیجه بررسی باشید.",
      },
      exception_eligibility_approval: {
        bg: "bg-green-50 border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        textColor: "text-green-800",
        textColorSecondary: "text-green-700",
        icon: "FaCheckCircle",
        title: "مشمولیت استثنا شما تایید شده است",
        message: "درخواست شما به مرحله بررسی نهایی ارسال شده است.",
      },
      exception_eligibility_rejection: {
        bg: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        textColor: "text-red-800",
        textColorSecondary: "text-red-700",
        icon: "FaTimesCircle",
        title: "مشمولیت استثنا شما رد شده است",
        message: "متأسفانه شما واجد شرایط استثنا نمی‌باشید.",
      },
      source_approval: {
        bg: "bg-green-50 border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        textColor: "text-green-800",
        textColorSecondary: "text-green-700",
        icon: "FaCheckCircle",
        title: "درخواست شما توسط منطقه مبدا تایید شده است",
        message: "درخواست شما به استان برای بررسی ارسال شده است.",
      },
      source_rejection: {
        bg: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        textColor: "text-red-800",
        textColorSecondary: "text-red-700",
        icon: "FaTimesCircle",
        title: "درخواست شما توسط منطقه مبدا رد شده است",
        message: "متأسفانه درخواست شما مورد تایید قرار نگرفت.",
      },
      province_review: {
        bg: "bg-blue-50 border-blue-200",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        textColor: "text-blue-800",
        textColorSecondary: "text-blue-700",
        icon: "FaClock",
        title: "درخواست شما در حال بررسی توسط استان است",
        message: "لطفاً منتظر نتیجه بررسی باشید.",
      },
      province_approval: {
        bg: "bg-green-50 border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        textColor: "text-green-800",
        textColorSecondary: "text-green-700",
        icon: "FaCheckCircle",
        title: "درخواست شما توسط استان تایید شده است",
        message: "درخواست شما به منطقه مقصد برای بررسی نهایی ارسال شده است.",
      },
      province_rejection: {
        bg: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        textColor: "text-red-800",
        textColorSecondary: "text-red-700",
        icon: "FaTimesCircle",
        title: "درخواست شما توسط استان رد شده است",
        message: "متأسفانه درخواست شما مورد تایید قرار نگرفت.",
      },
      destination_review: {
        bg: "bg-blue-50 border-blue-200",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        textColor: "text-blue-800",
        textColorSecondary: "text-blue-700",
        icon: "FaClock",
        title: "درخواست شما در حال بررسی نهایی توسط منطقه مقصد است",
        message: "شما در آخرین مرحله بررسی قرار دارید.",
      },
      destination_approval: {
        bg: "bg-purple-50 border-purple-200",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        textColor: "text-purple-800",
        textColorSecondary: "text-purple-700",
        icon: "FaCheckCircle",
        title: "تبریک! درخواست شما تایید نهایی شده است",
        message: "درخواست تجدیدنظر در نتیجه انتقال شما با موفقیت تایید شد.",
      },
      destination_rejection: {
        bg: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        textColor: "text-red-800",
        textColorSecondary: "text-red-700",
        icon: "FaTimesCircle",
        title: "درخواست شما توسط منطقه مقصد رد شده است",
        message: "متأسفانه درخواست شما در مرحله نهایی رد شد.",
      },
    };

    return (
      notifications[status] || {
        bg: "bg-gray-50 border-gray-200",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        textColor: "text-gray-800",
        textColorSecondary: "text-gray-700",
        icon: "FaInfoCircle",
        title: "درخواست شما در حال پردازش است",
        message: "درخواست شما در حال بررسی است و امکان تغییر آن وجود ندارد.",
      }
    );
  };

  // تابع رندر آیکون بر اساس نام
  const renderIcon = (iconName, className) => {
    switch (iconName) {
      case "FaCheckCircle":
        return <FaCheckCircle className={className} />;
      case "FaClock":
        return <FaClock className={className} />;
      case "FaTimesCircle":
        return <FaTimesCircle className={className} />;
      case "FaInfoCircle":
        return <FaInfoCircle className={className} />;
      default:
        return <FaInfoCircle className={className} />;
    }
  };

  // تابع تبدیل شماره مرحله به فارسی
  const getStepDisplayName = (step) => {
    const stepMap = {
      2: "مرحله ۲ - نمایش مشخصات",
      3: "مرحله ۳ - فرم ثبت درخواست تجدید نظر",
      4: "مرحله ۴ - کنترل نوع انتقال",
      5: "مرحله ۵ - پیش نمایش اطلاعات",
      6: "مرحله ۶ - تایید نهایی",
    };
    return stepMap[step] || `مرحله ${step}`;
  };

  // تابع دانلود مدرک
  const handleDownloadDocument = async (fileName, originalName) => {
    try {
      const response = await fetch(
        `/api/transfer-applicant/download-document/${fileName}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("خطا در دانلود فایل");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = originalName || fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("فایل با موفقیت دانلود شد");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("خطا در دانلود فایل");
    }
  };

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaClipboardList className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    وضعیت درخواست تجدیدنظر در نتیجه انتقال
                  </h1>
                  <p className="text-blue-100 text-sm">
                    مشاهده جزئیات و گردش کار درخواست شما
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* نمایش دکمه بازگشت به حالت ویرایش فقط اگر وضعیت اجازه دهد */}
                {(userSpecs?.currentRequestStatus === "user_no_action" ||
                  userSpecs?.currentRequestStatus ===
                    "awaiting_user_approval") && (
                  <button
                    onClick={() => onBack()}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <FaUndo className="h-4 w-4" />
                    بازگشت به حالت ویرایش
                  </button>
                )}
                <button
                  onClick={() => window.history.back()}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  بازگشت
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* راهنمای کاربری */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-orange-500 text-white p-2 rounded-lg flex-shrink-0">
              <FaInfoCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 mb-2">تذکر مهم :</h3>
              <p className="text-orange-700 text-sm leading-relaxed text-justify">
                همکار محترم، ثبت درخواست تجدیدنظر در نتیجه انتقال داخل استان و
                پیگیری نتیجه آن، صرفاً از طریق همین سامانه انجام می شود؛ لذا
                ضروری است از مراجعه حضوری به ادارات آموزش و پرورش خودداری شود.
                ضمناً امکان گفتگو با کارشناسان مربوطه (درصورت ضرورت) به صورت
                آنلاین از طریق همین سامانه فراهم می باشد. لازم به ذکر است نتایج
                نهایی تجدیدنظر پس از تصویب کارگروه اداره کل، علاوه بر اعلام در
                این سامانه، در سامانه وزارتی my.medu.ir نیز ثبت خواهد شد.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar خلاصه */}
        {userSpecs?.currentRequestStatus &&
          userSpecs.currentRequestStatus !== "user_no_action" &&
          userSpecs.currentRequestStatus !== "awaiting_user_approval" && (
            <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">پیشرفت درخواست</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    وضعیت:{" "}
                    {getStatusDisplayName(userSpecs.currentRequestStatus)}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center justify-between relative min-w-max px-4 md:px-0 md:min-w-0">
                  {/* خط پس‌زمینه */}
                  <div className="absolute top-4 left-4 right-4 md:left-0 md:right-0 h-1 bg-gray-200 rounded-full"></div>

                  {getWorkflowSteps(userSpecs.currentRequestStatus).map(
                    (step, index) => {
                      const timelineStatus = getTimelineStatus(
                        step.status,
                        userSpecs.currentRequestStatus,
                        userSpecs.requestStatusWorkflow,
                        getWorkflowSteps(userSpecs.currentRequestStatus)
                      );

                      const isCompleted = timelineStatus === "completed";
                      const isCurrent = timelineStatus === "current";
                      const totalSteps = getWorkflowSteps(
                        userSpecs.currentRequestStatus
                      ).length;
                      const completedCount = getWorkflowSteps(
                        userSpecs.currentRequestStatus
                      ).filter(
                        (s, i) =>
                          getTimelineStatus(
                            s.status,
                            userSpecs.currentRequestStatus,
                            userSpecs.requestStatusWorkflow,
                            getWorkflowSteps(userSpecs.currentRequestStatus)
                          ) === "completed"
                      ).length;

                      return (
                        <div
                          key={step.status}
                          className="relative z-10 flex flex-col items-center mx-1 md:mx-0"
                        >
                          {/* نقطه */}
                          <div
                            className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              isCompleted
                                ? step.status.includes("rejection")
                                  ? "bg-red-500 border-red-500"
                                  : "bg-green-500 border-green-500"
                                : isCurrent
                                ? "bg-blue-500 border-blue-500 animate-pulse"
                                : "bg-gray-200 border-gray-300"
                            }`}
                          >
                            {isCompleted &&
                              step.status.includes("rejection") && (
                                <FaTimes className="w-2 h-2 md:w-3 md:h-3 text-white" />
                              )}
                            {isCompleted &&
                              !step.status.includes("rejection") && (
                                <FaCheck className="w-2 h-2 md:w-3 md:h-3 text-white" />
                              )}
                            {isCurrent && (
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"></div>
                            )}
                            {!isCompleted && !isCurrent && (
                              <span className="text-xs font-bold text-gray-400">
                                {index + 1}
                              </span>
                            )}
                          </div>

                          {/* عنوان */}
                          <span
                            className={`text-xs mt-1 md:mt-2 text-center max-w-12 md:max-w-16 leading-tight ${
                              isCompleted
                                ? step.status.includes("rejection")
                                  ? "text-red-700 font-medium"
                                  : "text-green-700 font-medium"
                                : isCurrent
                                ? "text-blue-700 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                      );
                    }
                  )}

                  {/* خط پیشرفت */}
                  <div
                    className="absolute top-3 md:top-4 right-4 md:right-0 h-1 bg-gradient-to-l from-green-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((getWorkflowSteps(
                            userSpecs.currentRequestStatus
                          ).findIndex(
                            (s) => s.status === userSpecs.currentRequestStatus
                          ) +
                            1) /
                            getWorkflowSteps(userSpecs.currentRequestStatus)
                              .length) *
                            100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* خلاصه وضعیت */}
              <div className="flex justify-center mt-4 text-sm text-gray-600">
                <span>
                  {
                    getWorkflowSteps(userSpecs.currentRequestStatus).filter(
                      (s, i) =>
                        getTimelineStatus(
                          s.status,
                          userSpecs.currentRequestStatus,
                          userSpecs.requestStatusWorkflow,
                          getWorkflowSteps(userSpecs.currentRequestStatus)
                        ) === "completed"
                    ).length
                  }{" "}
                  از {getWorkflowSteps(userSpecs.currentRequestStatus).length}{" "}
                  مرحله تکمیل شده
                </span>
              </div>
            </div>
          )}

        {/* اعلان وضعیت درخواست */}
        {userSpecs?.currentRequestStatus &&
          userSpecs.currentRequestStatus !== "user_no_action" &&
          userSpecs.currentRequestStatus !== "awaiting_user_approval" && (
            <div
              className={`${
                getStatusNotification(userSpecs.currentRequestStatus).bg
              } border rounded-xl p-4 mb-6`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${
                    getStatusNotification(userSpecs.currentRequestStatus).iconBg
                  } p-2 rounded-lg`}
                >
                  {renderIcon(
                    getStatusNotification(userSpecs.currentRequestStatus).icon,
                    `h-6 w-6 ${
                      getStatusNotification(userSpecs.currentRequestStatus)
                        .iconColor
                    }`
                  )}
                </div>
                <div>
                  <h3
                    className={`font-semibold ${
                      getStatusNotification(userSpecs.currentRequestStatus)
                        .textColor
                    }`}
                  >
                    {
                      getStatusNotification(userSpecs.currentRequestStatus)
                        .title
                    }
                  </h3>
                  <p
                    className={`${
                      getStatusNotification(userSpecs.currentRequestStatus)
                        .textColorSecondary
                    } text-sm mt-1`}
                  >
                    وضعیت فعلی:{" "}
                    <span className="font-medium">
                      {getStatusDisplayName(userSpecs.currentRequestStatus)}
                    </span>
                    <br />
                    {
                      getStatusNotification(userSpecs.currentRequestStatus)
                        .message
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* اطلاعات کلی درخواست */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
              <div className="bg-blue-50 p-4 border-b border-blue-200">
                <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <FaUser className="h-5 w-5" />
                  اطلاعات متقاضی
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      نام و نام خانوادگی:
                    </label>
                    <p className="text-gray-800 font-medium">
                      {requestDetails?.userSpecs?.firstName}{" "}
                      {requestDetails?.userSpecs?.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      کد ملی:
                    </label>
                    <p className="text-gray-800 font-medium">
                      {requestDetails?.userSpecs?.nationalId || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      کد پرسنلی:
                    </label>
                    <p className="text-gray-800 font-medium">
                      {requestDetails?.userSpecs?.personnelCode || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      شماره همراه:
                    </label>
                    <p className="text-gray-800 font-medium">
                      {requestDetails?.userSpecs?.mobile || "-"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      وضعیت فعلی:
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor(
                          requestDetails?.userSpecs?.currentRequestStatus
                        )}`}
                      >
                        {getStatusDisplayName(
                          requestDetails?.userSpecs?.currentRequestStatus
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* خلاصه وضعیت */}
          <div>
            <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
              <div className="bg-blue-50 p-4 border-b border-blue-200">
                <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <FaInfoCircle className="h-5 w-5" />
                  خلاصه درخواست
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      تعداد تغییرات وضعیت:
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {requestDetails?.userSpecs?.requestStatusWorkflow
                        ?.length || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      آخرین به‌روزرسانی:
                    </label>
                    <p className="text-gray-800 text-sm">
                      {formatDate(
                        requestDetails?.userSpecs?.requestStatusWorkflow?.[
                          requestDetails.userSpecs.requestStatusWorkflow
                            .length - 1
                        ]?.changedAt
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* جزئیات درخواست تجدید نظر */}
        {requestDetails?.appealRequest && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
            <div className="bg-green-50 p-4 border-b border-green-200">
              <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <FaFileAlt className="h-5 w-5" />
                جزئیات درخواست تجدید نظر
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* بندهای استثنای انتخاب شده */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    📋 بندهای استثنای انتخاب شده
                  </h3>
                  <div className="space-y-4">
                    {requestDetails.appealRequest.selectedReasons?.map(
                      (reason, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* هدر بند */}
                          <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-purple-800 mb-1">
                                  {reason.title} - {reason.reasonTitle}
                                </h4>
                                <div className="text-xs text-purple-600">
                                  کد بند: {reason.reasonCode}
                                </div>
                              </div>
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                                بند {index + 1}
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            {/* توضیحات بند */}
                            {reason.reasonId?.description && (
                              <div className="mb-4">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                                  توضیحات بند:
                                </span>
                                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">
                                  {reason.reasonId.description}
                                </p>
                              </div>
                            )}

                            {/* هشدار سنوات */}
                            {requestDetails.appealRequest.yearsWarnings?.find(
                              (w) => w.reasonId === reason.reasonId?._id
                            ) && (
                              <div className="mb-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                    <FaExclamationTriangle className="h-4 w-4" />
                                    <span className="font-medium text-sm">
                                      هشدار سنوات:
                                    </span>
                                  </div>
                                  <p className="text-yellow-700 text-sm">
                                    {
                                      requestDetails.appealRequest.yearsWarnings.find(
                                        (w) =>
                                          w.reasonId === reason.reasonId?._id
                                      )?.message
                                    }
                                  </p>
                                  <div className="mt-2 text-xs text-yellow-600">
                                    سنوات کاربر:{" "}
                                    {
                                      requestDetails.appealRequest.yearsWarnings.find(
                                        (w) =>
                                          w.reasonId === reason.reasonId?._id
                                      )?.userYears
                                    }{" "}
                                    سال | سنوات مورد نیاز:{" "}
                                    {
                                      requestDetails.appealRequest.yearsWarnings.find(
                                        (w) =>
                                          w.reasonId === reason.reasonId?._id
                                      )?.requiredYears
                                    }{" "}
                                    سال
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* مدارک بارگذاری شده */}
                            {requestDetails.appealRequest.uploadedDocuments &&
                              requestDetails.appealRequest.uploadedDocuments[
                                reason.reasonId?._id
                              ] &&
                              requestDetails.appealRequest.uploadedDocuments[
                                reason.reasonId._id
                              ].length > 0 && (
                                <div className="mb-4">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                                    مدارک بارگذاری شده:
                                  </span>
                                  <div className="space-y-2">
                                    {requestDetails.appealRequest.uploadedDocuments[
                                      reason.reasonId._id
                                    ]
                                      .filter((doc) => doc) // فقط نمایش مدارک موجود
                                      .map((doc, docIndex) => (
                                        <div
                                          key={docIndex}
                                          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              <span className="text-sm font-medium text-blue-700">
                                                مدرک {docIndex + 1}:{" "}
                                                {doc.originalName}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-blue-600">
                                                {new Date(
                                                  doc.uploadedAt
                                                ).toLocaleDateString("fa-IR")}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleDownloadDocument(
                                                    doc.fileName,
                                                    doc.originalName
                                                  )
                                                }
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                                                title="دانلود فایل"
                                              >
                                                <svg
                                                  className="w-3 h-3"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                  />
                                                </svg>
                                                دانلود
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* نظر کارشناس منطقه/استان */}
                            {reason.review &&
                              reason.review.status !== "pending" && (
                                <div className="mb-4">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                                    نظر کارشناس:
                                  </span>
                                  <div
                                    className={`rounded-lg p-3 border ${
                                      reason.review.status === "approved"
                                        ? "bg-green-50 border-green-200"
                                        : reason.review.status === "rejected"
                                        ? "bg-red-50 border-red-200"
                                        : "bg-yellow-50 border-yellow-200"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                          reason.review.status === "approved"
                                            ? "bg-green-500"
                                            : reason.review.status ===
                                              "rejected"
                                            ? "bg-red-500"
                                            : "bg-yellow-500"
                                        }`}
                                      >
                                        {reason.review.status === "approved" ? (
                                          <svg
                                            className="w-4 h-4 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        ) : reason.review.status ===
                                          "rejected" ? (
                                          <svg
                                            className="w-4 h-4 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className="w-4 h-4 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span
                                            className={`font-medium text-sm ${
                                              reason.review.status ===
                                              "approved"
                                                ? "text-green-800"
                                                : reason.review.status ===
                                                  "rejected"
                                                ? "text-red-800"
                                                : "text-yellow-800"
                                            }`}
                                          >
                                            {reason.review.status === "approved"
                                              ? "تایید شده"
                                              : reason.review.status ===
                                                "rejected"
                                              ? "رد شده"
                                              : "در انتظار بررسی"}
                                          </span>
                                          <span
                                            className={`text-xs px-2 py-1 rounded-full ${
                                              reason.review.reviewerRole ===
                                              "districtTransferExpert"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-purple-100 text-purple-700"
                                            }`}
                                          >
                                            {reason.review.reviewerRole ===
                                            "districtTransferExpert"
                                              ? "کارشناس منطقه"
                                              : "کارشناس استان"}
                                          </span>
                                        </div>

                                        {reason.review.expertComment && (
                                          <div className="mt-2">
                                            <p
                                              className={`text-sm leading-relaxed ${
                                                reason.review.status ===
                                                "approved"
                                                  ? "text-green-700"
                                                  : reason.review.status ===
                                                    "rejected"
                                                  ? "text-red-700"
                                                  : "text-yellow-700"
                                              }`}
                                            >
                                              {reason.review.expertComment}
                                            </p>
                                          </div>
                                        )}

                                        {reason.review.reviewedAt && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <span className="text-xs text-gray-500">
                                              تاریخ بررسی:{" "}
                                              {new Date(
                                                reason.review.reviewedAt
                                              ).toLocaleDateString("fa-IR", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* اطلاعات زوج فرهنگی */}

                {requestDetails.appealRequest.culturalCoupleInfo
                  ?.personnelCode && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <FaUserFriends className="h-5 w-5" /> اطلاعات زوج فرهنگی
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-green-700 block mb-1">
                            کد پرسنلی همسر:
                          </label>
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                            <span className="text-gray-800 font-mono">
                              {
                                requestDetails.appealRequest.culturalCoupleInfo
                                  .personnelCode
                              }
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-green-700 block mb-1">
                            منطقه همسر:
                          </label>
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="flex flex-col">
                              <span className="text-gray-800 font-medium">
                                {requestDetails.appealRequest.culturalCoupleInfo
                                  .districtName || "نامشخص"}
                              </span>
                              <span className="text-gray-500 text-sm">
                                کد:{" "}
                                {
                                  requestDetails.appealRequest
                                    .culturalCoupleInfo.districtCode
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* نظر و توضیحات و تصمیم منطقه خدمت همسر */}
                        {(requestDetails.appealRequest.culturalCoupleInfo
                          ?.spouseDistrictOpinion ||
                          requestDetails.appealRequest.culturalCoupleInfo
                            ?.spouseDistrictDescription ||
                          requestDetails.appealRequest.culturalCoupleInfo
                            ?.spouseDistrictDecision) && (
                          <div className="grid grid-cols-1 gap-4 mt-4">
                            {/* تصمیم منطقه همسر */}
                            {requestDetails.appealRequest.culturalCoupleInfo
                              .spouseDistrictDecision && (
                              <div>
                                <label className="text-sm font-medium text-green-700 block mb-1">
                                  تصمیم منطقه خدمت همسر:
                                </label>
                                <div
                                  className={`rounded-lg p-3 border ${
                                    requestDetails.appealRequest
                                      .culturalCoupleInfo
                                      .spouseDistrictDecision === "approve"
                                      ? "bg-green-100 border-green-300"
                                      : "bg-red-100 border-red-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                        requestDetails.appealRequest
                                          .culturalCoupleInfo
                                          .spouseDistrictDecision === "approve"
                                          ? "bg-green-500"
                                          : "bg-red-500"
                                      }`}
                                    >
                                      {requestDetails.appealRequest
                                        .culturalCoupleInfo
                                        .spouseDistrictDecision ===
                                      "approve" ? (
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      ) : (
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      className={`font-medium ${
                                        requestDetails.appealRequest
                                          .culturalCoupleInfo
                                          .spouseDistrictDecision === "approve"
                                          ? "text-green-800"
                                          : "text-red-800"
                                      }`}
                                    >
                                      {requestDetails.appealRequest
                                        .culturalCoupleInfo
                                        .spouseDistrictDecision === "approve"
                                        ? "تایید شده"
                                        : "رد شده"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {requestDetails.appealRequest.culturalCoupleInfo
                              .spouseDistrictOpinion && (
                              <div>
                                <label className="text-sm font-medium text-green-700 block mb-1">
                                  نظر منطقه خدمت همسر:
                                </label>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <span className="text-gray-800">
                                    {
                                      requestDetails.appealRequest
                                        .culturalCoupleInfo
                                        .spouseDistrictOpinion
                                    }
                                  </span>
                                </div>
                              </div>
                            )}

                            {requestDetails.appealRequest.culturalCoupleInfo
                              .spouseDistrictDescription && (
                              <div>
                                <label className="text-sm font-medium text-green-700 block mb-1">
                                  توضیح منطقه خدمت همسر:
                                </label>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <span className="text-gray-800 text-sm leading-relaxed">
                                    {
                                      requestDetails.appealRequest
                                        .culturalCoupleInfo
                                        .spouseDistrictDescription
                                    }
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* اولویت‌های مقصد */}
        {requestDetails?.destinationPriorities?.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
            <div className="bg-indigo-50 p-4 border-b border-indigo-200">
              <h2 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                <FaArrowRight className="h-5 w-5" />
                اولویت‌های مقصد انتخابی
              </h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                        اولویت
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">
                        مقصد
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">
                        استان
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                        نوع انتقال
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-right">
                    {requestDetails.destinationPriorities.map(
                      (destination, index) => (
                        <tr
                          key={destination.priority}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 text-center font-bold text-blue-600">
                            {destination.priority}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {destination.districtName}
                              </div>
                              <div className="text-sm text-gray-500">
                                کد: {destination.districtCode}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {destination.provinceName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                destination.transferType === "permanent_only"
                                  ? "bg-blue-100 text-blue-800"
                                  : destination.transferType ===
                                    "temporary_only"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {getTransferTypeText(destination.transferType)}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* توضیحات کاربر */}
        {requestDetails?.appealRequest?.userComments && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-8">
            <div className="bg-blue-50 p-4 border-b border-blue-200">
              <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <FaEdit className="h-5 w-5" />
                توضیحات تکمیلی کاربر
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {requestDetails.appealRequest.userComments}
                </p>

                {/* نمایش تصاویر پیوست */}
                {((requestDetails.appealRequest.userCommentsImages &&
                  requestDetails.appealRequest.userCommentsImages.length > 0) ||
                  (requestDetails.appealRequest.uploadedDocuments
                    ?.user_comments &&
                    requestDetails.appealRequest.uploadedDocuments.user_comments
                      .length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <FaImage className="h-4 w-4" />
                      تصاویر پیوست (
                      {(requestDetails.appealRequest.userCommentsImages
                        ?.length || 0) +
                        (requestDetails.appealRequest.uploadedDocuments
                          ?.user_comments?.length || 0)}
                      )
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* تصاویر از userCommentsImages */}
                      {requestDetails.appealRequest.userCommentsImages?.map(
                        (image, index) => (
                          <div
                            key={`user-comments-${index}`}
                            className="bg-white border border-gray-200 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <FaImage className="h-3 w-3 text-blue-600" />
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {image.originalName}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              {new Date(image.uploadedAt).toLocaleDateString(
                                "fa-IR"
                              )}
                            </div>
                            <a
                              href={`/api/transfer-applicant/download-document/${image.fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <FaDownload className="h-3 w-3" />
                              دانلود و مشاهده
                            </a>
                          </div>
                        )
                      )}
                      {/* تصاویر از uploadedDocuments */}
                      {requestDetails.appealRequest.uploadedDocuments?.user_comments?.map(
                        (image, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <FaImage className="h-3 w-3 text-blue-600" />
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {image.originalName}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              {new Date(image.uploadedAt).toLocaleDateString(
                                "fa-IR"
                              )}
                            </div>
                            <a
                              href={`/api/transfer-applicant/download-document/${image.fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <FaDownload className="h-3 w-3" />
                              دانلود و مشاهده
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* گردش کار و تاریخچه تغییرات */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 p-4 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <FaClock className="h-5 w-5" />
                تاریخچه گردش کار درخواست
              </h2>
              <button
                onClick={() => setShowWorkflowHistory(!showWorkflowHistory)}
                className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg transition-colors text-sm font-medium"
              >
                {showWorkflowHistory ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    مخفی کردن
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    نمایش جزئیات
                  </>
                )}
              </button>
            </div>
          </div>
          {showWorkflowHistory && (
            <div className="p-6 border-t border-blue-100">
              {/* Timeline خطی */}
              <div className="relative">
                {/* خط اصلی timeline */}
                <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                {getWorkflowSteps(
                  requestDetails?.userSpecs?.currentRequestStatus
                ).map((step, index) => {
                  const currentWorkflowSteps = getWorkflowSteps(
                    requestDetails?.userSpecs?.currentRequestStatus
                  );
                  const timelineStatus = getTimelineStatus(
                    step.status,
                    requestDetails?.userSpecs?.currentRequestStatus,
                    requestDetails?.userSpecs?.requestStatusWorkflow,
                    currentWorkflowSteps
                  );

                  const colors = getStatusColorScheme(step.status);
                  const workflowItem =
                    requestDetails?.userSpecs?.requestStatusWorkflow?.find(
                      (item) => item.status === step.status
                    );

                  const isCompleted = timelineStatus === "completed";
                  const isCurrent = timelineStatus === "current";
                  const isPending = timelineStatus === "pending";

                  return (
                    <div
                      key={step.status}
                      className="relative flex items-start mb-8 last:mb-0"
                    >
                      {/* نقطه timeline */}
                      <div className="relative z-10 flex items-center justify-center">
                        <div
                          className={`w-8 h-8 rounded-full border-4 flex items-center justify-center ${
                            isCompleted
                              ? step.status.includes("rejection")
                                ? "bg-red-500 border-red-300"
                                : "bg-green-500 border-green-300"
                              : isCurrent
                              ? `${colors.dot} border-white shadow-lg animate-pulse`
                              : "bg-gray-300 border-gray-200"
                          }`}
                        >
                          {isCompleted && step.status.includes("rejection") && (
                            <FaTimes className="w-3 h-3 text-white" />
                          )}
                          {isCompleted &&
                            !step.status.includes("rejection") && (
                              <FaCheck className="w-3 h-3 text-white" />
                            )}
                          {isCurrent && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>

                      {/* محتوای مرحله */}
                      <div className="mr-6 flex-1">
                        <div
                          className={`p-4 rounded-lg border-2 ${
                            isCompleted
                              ? step.status.includes("rejection")
                                ? "bg-red-50 border-red-200"
                                : "bg-green-50 border-green-200"
                              : isCurrent
                              ? `${colors.bg} ${colors.border}`
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {/* عنوان مرحله */}
                          <div className="flex items-center justify-between mb-2">
                            <h3
                              className={`font-bold text-lg ${
                                isCompleted
                                  ? step.status.includes("rejection")
                                    ? "text-red-800"
                                    : "text-green-800"
                                  : isCurrent
                                  ? colors.text
                                  : "text-gray-600"
                              }`}
                            >
                              {step.title}
                            </h3>

                            {/* نشان وضعیت */}
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    step.status.includes("rejection")
                                      ? "bg-red-100 text-red-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {step.status.includes("rejection")
                                    ? "رد شده"
                                    : "تکمیل شده"}
                                </span>
                              )}
                              {isCurrent && (
                                <span
                                  className={`text-xs ${colors.bg} ${colors.text} px-2 py-1 rounded-full font-medium`}
                                >
                                  در حال انجام
                                </span>
                              )}
                              {isPending && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                                  در انتظار
                                </span>
                              )}
                            </div>
                          </div>

                          {/* توضیحات مرحله */}
                          <p
                            className={`text-sm mb-3 ${
                              isCompleted
                                ? step.status.includes("rejection")
                                  ? "text-red-700"
                                  : "text-green-700"
                                : isCurrent
                                ? colors.text.replace("800", "700")
                                : "text-gray-500"
                            }`}
                          >
                            {step.description}
                          </p>

                          {/* جزئیات اگر انجام شده */}
                          {workflowItem && (
                            <div className="bg-white bg-opacity-60 rounded-md p-3 border border-white border-opacity-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">
                                  تاریخ انجام:
                                </span>
                                <span className="text-xs text-gray-800">
                                  {formatDate(workflowItem.changedAt)}
                                </span>
                              </div>

                              {workflowItem.reason && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-gray-600 block mb-1">
                                    دلیل:
                                  </span>
                                  <p className="text-xs text-gray-800 leading-relaxed">
                                    {workflowItem.reason}
                                  </p>
                                </div>
                              )}

                              {workflowItem.metadata?.actionType && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">
                                    نوع عملیات:
                                  </span>{" "}
                                  {getActionTypeDisplayName(
                                    workflowItem.metadata.actionType
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* پیام وضعیت فعلی */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaClock className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-800">
                      وضعیت فعلی درخواست
                    </h4>
                    <p className="text-sm text-blue-700">
                      {getStatusDisplayName(
                        requestDetails?.userSpecs?.currentRequestStatus ||
                          "نامشخص"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showWorkflowHistory && (
            <div className="p-4 text-center border-t border-blue-100">
              <p className="text-gray-500 text-sm">
                برای مشاهده جزئیات تاریخچه گردش کار، روی &ldquo;نمایش
                جزئیات&rdquo; کلیک کنید
              </p>
            </div>
          )}
        </div>
      </div>

      {/* چت‌باکس شناور */}
      {(() => {
        console.log("Chat conditions:", {
          appealRequestId: requestDetails?.appealRequest?._id,
          currentStatus: userSpecs?.currentRequestStatus,
          shouldShow:
            requestDetails?.appealRequest?._id &&
            userSpecs?.currentRequestStatus !== "user_no_action" &&
            userSpecs?.currentRequestStatus !== "awaiting_user_approval",
        });
        return (
          requestDetails?.appealRequest?._id &&
          userSpecs?.currentRequestStatus !== "user_no_action" &&
          userSpecs?.currentRequestStatus !== "awaiting_user_approval"
        );
      })() && (
        <ChatBox
          appealRequestId={requestDetails.appealRequest._id}
          userRole="transferApplicant"
        />
      )}
    </div>
  );
}

export default function EmergencyTransferPage() {
  const { user, loading: userLoading } = useUserContext();

  // بررسی محدودیت تاریخ و وضعیت کاربر
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // State for transfer process steps
  const [currentStep, setCurrentStep] = useState(1); // 1: Rules, 2: Specifications, 3: Appeal Form, 4: Transfer Type, 5: Preview, 6: Final Confirmation
  const [preliminaryNotices, setPreliminaryNotices] = useState([]);
  const [acceptedNotices, setAcceptedNotices] = useState(new Set());
  const [loadingNotices, setLoadingNotices] = useState(false);

  // State for step 2 (Profile Specifications)
  const [userSpecs, setUserSpecs] = useState(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    disputedField: "",
    description: "",
    attachmentImage: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // State for step 3 (Appeal Request Form)
  const [transferReasons, setTransferReasons] = useState([]);
  const [loadingTransferReasons, setLoadingTransferReasons] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState(new Set());
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [culturalCoupleInfo, setCulturalCoupleInfo] = useState({
    personnelCode: "",
    districtCode: "",
  });
  const [yearsWarnings, setYearsWarnings] = useState([]);
  const [medicalCommissionWarnings, setMedicalCommissionWarnings] = useState(
    []
  );
  const [districts, setDistricts] = useState([]);
  const [userComments, setUserComments] = useState(""); // توضیحات کاربر
  const [userCommentsImages, setUserCommentsImages] = useState([]); // تصاویر توضیحات کاربر
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // State for step 4 (Transfer Type Control)
  const [destinationPriorities, setDestinationPriorities] = useState([]);
  const [transferTypes, setTransferTypes] = useState({});
  const [canEditDestination, setCanEditDestination] = useState(false);
  const [editingDestinations, setEditingDestinations] = useState({});
  const [hasChangesStep4, setHasChangesStep4] = useState(false);
  const [savingStep4, setSavingStep4] = useState(false);

  // State for step 6 (Final Confirmation)
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [submittingFinalRequest, setSubmittingFinalRequest] = useState(false);

  // State for read-only view
  const [showReadOnlyView, setShowReadOnlyView] = useState(false);

  // State for initial status check
  const [initialStatusChecked, setInitialStatusChecked] = useState(false);

  // بررسی محدودیت تاریخ و وضعیت کاربر
  useEffect(() => {
    const checkAccessRestrictions = async () => {
      // بررسی تاریخ محدودیت (از ساعت 24 امشب 31 اگوست 2025)
      const restrictionDate = new Date("2025-08-31T24:00:00");
      const currentDate = new Date();
      console.log("userSpecs  ====?", userSpecs);
      if (currentDate >= restrictionDate) {
        // اگر تاریخ محدودیت رسیده، بررسی وضعیت کاربر
        // اگر userSpecs وجود ندارد یا وضعیت awaiting_user_approval نیست
        if (
          !userSpecs ||
          userSpecs.currentRequestStatus !== "awaiting_user_approval"
        ) {
          setAccessRestricted(true);
          setRestrictionMessage(
            "مهلت ثبت درخواست تجدیدنظر به پایان رسیده است."
          );
        } else {
          // اگر کاربر مجاز است، محدودیت را برطرف کن
          setAccessRestricted(false);
          setRestrictionMessage("");
        }
      } else {
        // اگر هنوز تاریخ محدودیت نرسیده، محدودیت را برطرف کن
        setAccessRestricted(false);
        setRestrictionMessage("");
      }
    };

    // فقط زمانی چک کن که user موجود باشد و phoneVerified باشد و userSpecs بارگذاری شده باشد
    // userSpecs ممکن است null باشد (کاربرانی که هنوز درخواستی ندارند) اما باید منتظر بمانیم تا بارگذاری تمام شود
    if (userSpecs) {
      checkAccessRestrictions();
    }
  }, [userSpecs]);

  // تابع تبدیل شماره مرحله به فارسی (فقط برای main component)
  const getStepDisplayName = (step) => {
    const stepMap = {
      2: "مرحله ۲ - نمایش مشخصات",
      3: "مرحله ۳ - فرم ثبت درخواست تجدید نظر",
      4: "مرحله ۴ - کنترل نوع انتقال",
      5: "مرحله ۵ - پیش نمایش اطلاعات",
      6: "مرحله ۶ - تایید نهایی",
    };
    return stepMap[step] || `مرحله ${step}`;
  };

  // تابع تعیین مراحل workflow بر اساس وضعیت فعلی
  const getWorkflowSteps = (currentStatus) => {
    const baseSteps = [
      {
        status: "user_no_action",
        title: "ثبت اولیه",
        description: "درخواست ایجاد شده",
      },
      {
        status: "awaiting_user_approval",
        title: "تکمیل اطلاعات",
        description: "در انتظار تکمیل توسط کاربر",
      },
      {
        status: "user_approval",
        title: "در انتظار بررسی",
        description: "درخواست توسط کاربر تایید شد",
      },
      {
        status: "source_review",
        title: "بررسی مبدا",
        description: "در حال بررسی توسط منطقه مبدا",
      },
    ];

    // اضافه کردن مراحل بر اساس وضعیت فعلی
    if (currentStatus === "exception_eligibility_rejection") {
      baseSteps.push({
        status: "exception_eligibility_rejection",
        title: "رد مشمولیت استثنا",
        description: "مشمولیت استثنا رد شد",
      });
    } else if (currentStatus === "source_rejection") {
      baseSteps.push({
        status: "source_rejection",
        title: "رد مبدا",
        description: "درخواست توسط منطقه مبدا رد شد",
      });
    } else {
      // اضافه کردن مرحله تایید مشمولیت استثنا (اختیاری)
      if (
        currentStatus === "exception_eligibility_approval" ||
        currentStatus === "source_approval" ||
        currentStatus === "province_review" ||
        currentStatus === "province_approval" ||
        currentStatus === "province_rejection" ||
        currentStatus === "destination_review" ||
        currentStatus === "destination_approval" ||
        currentStatus === "destination_rejection"
      ) {
        baseSteps.push({
          status: "exception_eligibility_approval",
          title: "تایید مشمولیت استثنا",
          description: "مشمولیت استثنا تایید شد",
        });
      }

      baseSteps.push(
        {
          status: "source_approval",
          title: "تایید مبدا",
          description: "توسط منطقه مبدا تایید شد",
        },
        {
          status: "province_review",
          title: "بررسی استان",
          description: "در حال بررسی توسط استان",
        }
      );

      if (currentStatus === "province_rejection") {
        baseSteps.push({
          status: "province_rejection",
          title: "رد استان",
          description: "درخواست توسط استان رد شد",
        });
      } else {
        baseSteps.push(
          {
            status: "province_approval",
            title: "تایید استان",
            description: "توسط استان تایید شد",
          },
          {
            status: "destination_review",
            title: "بررسی مقصد",
            description: "در حال بررسی توسط منطقه مقصد",
          },
          {
            status: "approved",
            title: "تایید نهایی",
            description: "درخواست به طور کامل تایید شد",
          },
          {
            status: "completed",
            title: "تکمیل",
            description: "فرایند انتقال تکمیل شد",
          }
        );
      }
    }

    return baseSteps;
  };

  // تابع تعیین وضعیت timeline
  const getTimelineStatus = (
    stepStatus,
    currentStatus,
    workflowHistory,
    workflowSteps
  ) => {
    const currentStepIndex = workflowSteps.findIndex(
      (step) => step.status === currentStatus
    );
    const stepIndex = workflowSteps.findIndex(
      (step) => step.status === stepStatus
    );

    // بررسی اینکه آیا این مرحله در تاریخچه انجام شده یا نه
    const hasBeenProcessed = workflowHistory?.some(
      (item) => item.status === stepStatus
    );

    if (hasBeenProcessed) {
      return "completed";
    } else if (stepStatus === currentStatus) {
      return "current";
    } else if (stepIndex < currentStepIndex) {
      return "completed";
    } else {
      return "pending";
    }
  };

  // تابع نمایش نام وضعیت
  const getStatusDisplayName = (status) => {
    const statusMap = {
      user_no_action: "فاقد درخواست تجدیدنظر",
      awaiting_user_approval: "درخواست ناقص",
      user_approval: "در انتظار بررسی",
      source_review: "در حال بررسی مبدا",
      exception_eligibility_approval: "تایید مشمولیت",
      exception_eligibility_rejection: "رد مشمولیت (فاقد شرایط)",
      source_approval: "موافقت مبدا (موقت/دائم)",
      source_rejection: "مخالفت مبدا",
      province_review: "در حال بررسی توسط استان",
      province_approval: "موافقت استان",
      province_rejection: "مخالفت استان",
      // destination_review: "در حال بررسی مقصد",
      destination_approval: "تایید مقصد",
      destination_rejection: "رد مقصد",
      // destination_review: "در حال بررسی مقصد",
    };
    return statusMap[status] || status;
  };

  // تابع برای mask کردن شماره همراه
  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 8) return phone;
    const firstThree = phone.slice(0, 3);
    const lastTwo = phone.slice(-2);
    const masked = "*".repeat(phone.length - 5);
    return firstThree + masked + lastTwo;
  };

  // Set phone number from user when component mounts
  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  // Timer for resend code
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Check request status when user is authenticated
  useEffect(() => {
    if (user?.phoneVerified) {
      fetchUserSpecs();
    }
  }, [user?.phoneVerified]);

  // Fetch preliminary notices when user is authenticated
  useEffect(() => {
    if (user?.phoneVerified && currentStep === 1 && !showReadOnlyView) {
      fetchPreliminaryNotices();
    }
  }, [user?.phoneVerified, currentStep, showReadOnlyView]);

  // Fetch user specifications when step 2 is active
  useEffect(() => {
    if (user?.phoneVerified && currentStep === 2 && !showReadOnlyView) {
      fetchCorrectionRequests();
    }
  }, [user?.phoneVerified, currentStep, showReadOnlyView]);

  // Fetch transfer reasons when step 3 is active
  useEffect(() => {
    if (user?.phoneVerified && currentStep === 3 && !showReadOnlyView) {
      fetchTransferReasons();
      fetchDistricts();
    }
  }, [user?.phoneVerified, currentStep, showReadOnlyView]);

  // Fetch destination priorities when step 4 is active
  useEffect(() => {
    if (user?.phoneVerified && currentStep === 4 && !showReadOnlyView) {
      fetchDestinationPriorities();
    }
  }, [user?.phoneVerified, currentStep, userSpecs, showReadOnlyView]);

  // Function to fetch preliminary notices
  const fetchPreliminaryNotices = async () => {
    setLoadingNotices(true);
    try {
      const response = await fetch(
        "/api/transfer-applicant/preliminary-notices",
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setPreliminaryNotices(data.notices);
        // Initialize accepted notices as empty set
        setAcceptedNotices(new Set());
      } else {
        toast.error(data.error || "خطا در دریافت قوانین و مقررات");
      }
    } catch (error) {
      console.error("Error fetching preliminary notices:", error);
      toast.error("خطا در دریافت قوانین و مقررات");
    } finally {
      setLoadingNotices(false);
    }
  };

  // Function to handle notice acceptance
  const handleNoticeAcceptance = (noticeId, accepted) => {
    const newAcceptedNotices = new Set(acceptedNotices);
    if (accepted) {
      newAcceptedNotices.add(noticeId);
    } else {
      newAcceptedNotices.delete(noticeId);
    }
    setAcceptedNotices(newAcceptedNotices);
  };

  // Function to proceed to next step
  const handleProceedToNextStep = () => {
    if (acceptedNotices.size === preliminaryNotices.length) {
      setCurrentStep(2);
      toast.success(
        "مرحله اول تکمیل شد. در حال انتقال به مرحله نمایش مشخصات..."
      );
    } else {
      toast.error("لطفاً تمام قوانین و مقررات را مطالعه و تایید کنید");
    }
  };

  // Function to go back to previous step
  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to reset the process
  const handleResetProcess = () => {
    setCurrentStep(1);
    setAcceptedNotices(new Set());
    setFinalConfirmation(false);
    toast.success(
      "فرآیند از ابتدا شروع شد. لطفاً قوانین و مقررات را مجدداً مطالعه کنید."
    );
  };

  // Function to handle final submission
  const handleFinalSubmission = async () => {
    if (!finalConfirmation) {
      toast.error("لطفاً ابتدا تایید نهایی را انتخاب کنید");
      return;
    }

    setSubmittingFinalRequest(true);

    try {
      // تغییر وضعیت درخواست به user_approval ()
      const response = await fetch("/api/transfer-applicant/final-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          selectedReasons: Array.from(selectedReasons),
          culturalCoupleInfo: culturalCoupleInfo.personnelCode
            ? culturalCoupleInfo
            : null,
          destinationPriorities: destinationPriorities.map((p) => ({
            priority: p.priority,
            destinationCode: p.destinationCode,
            transferType: transferTypes[p.priority] || p.transferType,
          })),
          yearsWarnings: yearsWarnings,
          medicalCommissionWarnings: medicalCommissionWarnings,
          uploadedDocuments: uploadedDocuments,
          userComments: userComments.trim() || null,
          userCommentsImages: userCommentsImages, // تصاویر توضیحات کاربر
          finalConfirmation: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در ارسال درخواست");
      }

      const data = await response.json();

      if (data.success) {
        toast.success(
          "درخواست تجدیدنظر در نتیجه انتقال  با موفقیت ثبت و ارسال شد!"
        );

        // نمایش پیام آماده‌سازی برای ریلود
        setTimeout(() => {
          toast.info("در حال بارگذاری مجدد صفحه...");
        }, 1000);

        // ریلود فوری صفحه بعد از نمایش پیام موفقیت
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.error || "خطا در ارسال درخواست");
      }
    } catch (error) {
      console.error("Error in final submission:", error);
      toast.error("خطا در ارسال درخواست. لطفاً مجدداً تلاش کنید");
    } finally {
      setSubmittingFinalRequest(false);
    }
  };

  // Helper function to check if a priority should be enabled
  const isPriorityEnabled = (priorityNumber) => {
    if (priorityNumber === 1) return true; // اولویت 1 همیشه فعال است

    // بررسی اینکه آیا اولویت قبلی پر شده است یا نه
    const previousPriority = destinationPriorities.find(
      (p) => p.priority === priorityNumber - 1
    );
    return (
      previousPriority &&
      previousPriority.destinationCode &&
      previousPriority.destinationCode !== ""
    );
  };

  // Helper function to get available districts for a specific priority
  const getAvailableDistrictsForPriority = (currentPriority) => {
    // دریافت کدهای مناطق انتخاب شده در سایر اولویت‌ها
    const selectedDistrictCodes = destinationPriorities
      .filter((p) => p.priority !== currentPriority && p.destinationCode)
      .map((p) => p.destinationCode);

    // فیلتر کردن مناطق موجود
    return districts.filter(
      (district) => !selectedDistrictCodes.includes(district.code)
    );
  };

  // Function to fetch user specifications
  const fetchUserSpecs = async () => {
    setLoadingSpecs(true);
    try {
      const response = await fetch("/api/transfer-applicant/profile-specs", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setUserSpecs(data.specs);

        // بررسی وضعیت درخواست برای تعیین نمایش
        const currentStatus = data.specs?.currentRequestStatus;

        // اگر وضعیت user_no_action یا awaiting_user_approval باشد، کاربر می‌تواند مراحل را ویرایش کند
        // در غیر این صورت، مراحل قفل می‌شوند و فقط جزئیات نمایش داده می‌شود
        if (
          currentStatus &&
          currentStatus !== "user_no_action" &&
          currentStatus !== "awaiting_user_approval"
        ) {
          setShowReadOnlyView(true);
        } else {
          setShowReadOnlyView(false);
        }
        setInitialStatusChecked(true);
      } else {
        toast.error(data.error || "خطا در دریافت مشخصات کاربر");
      }
    } catch (error) {
      console.error("Error fetching user specs:", error);
      toast.error("خطا در دریافت مشخصات کاربر");
    } finally {
      setLoadingSpecs(false);
      setInitialStatusChecked(true);
    }
  };

  // Function to handle image upload
  const handleImageUpload = async (file) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/transfer-applicant/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCorrectionForm((prev) => ({
          ...prev,
          attachmentImage: data.imageUrl,
        }));
        toast.success("تصویر با موفقیت آپلود شد");
      } else {
        toast.error(data.message || "خطا در آپلود تصویر");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("خطا در آپلود تصویر");
    } finally {
      setUploadingImage(false);
    }
  };

  // Function to submit correction request
  const handleSubmitCorrection = async () => {
    if (!correctionForm.disputedField || !correctionForm.description) {
      toast.error("لطفاً فیلد مورد اعتراض و توضیحات را پر کنید");
      return;
    }

    if (correctionForm.description.length < 10) {
      toast.error("توضیحات باید حداقل 10 کاراکتر باشد");
      return;
    }

    setSubmittingCorrection(true);
    try {
      const response = await fetch(
        "/api/transfer-applicant/profile-correction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(correctionForm),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowCorrectionModal(false);
        setCorrectionForm({
          disputedField: "",
          description: "",
          attachmentImage: null,
        });
        // بروزرسانی لیست درخواست‌ها
        fetchCorrectionRequests();
      } else {
        toast.error(data.error || "خطا در ارسال درخواست اصلاح");
      }
    } catch (error) {
      console.error("Error submitting correction:", error);
      toast.error("خطا در ارسال درخواست اصلاح");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Function to confirm specifications and proceed
  const handleConfirmSpecs = () => {
    // بررسی وجود درخواست pending
    if (hasPendingCorrectionRequest()) {
      toast.error(
        "شما درخواست اصلاح مشخصات در انتظار دارید. لطفاً ابتدا آن را بررسی کنید."
      );
      return;
    }
    toast.success("مشخصات تایید شد. در حال انتقال به مرحله بعد...");
    setCurrentStep(3);
    // if (
    //   window.confirm(
    //     "آیا از تایید اطلاعات خود اطمینان دارید؟ در صورت تایید، درخواست اصلاح مشخصات منتفی شده و رسیدگی نخواهد شد."
    //   )
    // ) {
    //   toast.success("مشخصات تایید شد. در حال انتقال به مرحله بعد...");
    //   setCurrentStep(3);
    // }
  };

  // دریافت درخواست‌های اصلاح مشخصات
  const fetchCorrectionRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await fetch(
        "/api/transfer-applicant/profile-correction-requests"
      );
      const data = await response.json();

      if (data.success) {
        setCorrectionRequests(data.requests);
      } else {
        console.error("Error fetching correction requests:", data.error);
        toast.error("خطا در دریافت درخواست‌های اصلاح مشخصات");
      }
    } catch (error) {
      console.error("Error fetching correction requests:", error);
      toast.error("خطا در دریافت درخواست‌های اصلاح مشخصات");
    } finally {
      setLoadingRequests(false);
    }
  };

  // حذف درخواست اصلاح مشخصات
  const handleDeleteCorrectionRequest = async (requestId) => {
    if (!confirm("آیا از حذف این درخواست اطمینان دارید؟")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/transfer-applicant/profile-correction/${requestId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success("درخواست اصلاح مشخصات با موفقیت حذف شد");
        // بروزرسانی لیست درخواست‌ها
        fetchCorrectionRequests();
      } else {
        toast.error(data.error || "خطا در حذف درخواست");
      }
    } catch (error) {
      console.error("Error deleting correction request:", error);
      toast.error("خطا در حذف درخواست");
    }
  };

  // بررسی وجود درخواست pending
  const hasPendingCorrectionRequest = () => {
    return false;
    // return correctionRequests.some((request) => request.status === "pending");
  };

  // دریافت دلایل انتقال برای مرحله 3
  const fetchTransferReasons = async () => {
    try {
      setLoadingTransferReasons(true);
      const response = await fetch("/api/transfer-applicant/transfer-reasons");
      const data = await response.json();

      if (data.success) {
        setTransferReasons(data.transferReasons);
      } else {
        toast.error(data.error || "خطا در دریافت دلایل انتقال");
      }
    } catch (error) {
      console.error("Error fetching transfer reasons:", error);
      toast.error("خطا در دریافت دلایل انتقال");
    } finally {
      setLoadingTransferReasons(false);
    }
  };

  // دریافت لیست مناطق
  const fetchDistricts = async () => {
    try {
      setLoadingDistricts(true);
      const response = await fetch("/api/transfer-applicant/districts");
      const data = await response.json();

      if (data.success) {
        setDistricts(data.districts);
      } else {
        toast.error(data.error || "خطا در دریافت لیست مناطق");
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
      toast.error("خطا در دریافت لیست مناطق");
    } finally {
      setLoadingDistricts(false);
    }
  };

  // دریافت اولویت‌های مقصد برای مرحله 4
  const fetchDestinationPriorities = async () => {
    try {
      if (!userSpecs) return;

      console.log("userSpecs for destination priorities:", userSpecs);

      // استخراج اولویت‌های مقصد از userSpecs
      const priorities = [];

      // همیشه تمام 7 اولویت را نمایش بده
      // تفاوت در نحوه نمایش خواهد بود (قابل ویرایش یا فقط نمایش)
      const shouldShowAllPriorities = true;

      for (let i = 1; i <= 7; i++) {
        const destinationField = `destinationPriority${i}`;
        const hasDestination = userSpecs[destinationField];

        // اگر باید همه اولویت‌ها را نمایش دهیم یا اولویت موجود باشد
        if (shouldShowAllPriorities || hasDestination) {
          let destinationText = "";
          let destinationCode = null;
          let transferTypeText = "دائم یا موقت با اولویت دائم";

          if (hasDestination) {
            console.log(
              `${destinationField}:`,
              userSpecs[destinationField],
              "type:",
              typeof userSpecs[destinationField]
            );

            // بررسی اینکه آیا destinationField یک object است یا string
            let destination = userSpecs[destinationField];

            if (typeof destination === "object" && destination !== null) {
              console.log("Object structure:", destination);

              // اگر object است، سعی کنیم بهترین نمایش را پیدا کنیم
              if (destination.name && destination.code) {
                destinationText = `${destination.name} (${destination.code})`;
                destinationCode = destination.code;
              } else if (destination.districtCode) {
                // اگر فقط کد منطقه داریم، سعی کنیم نام منطقه را پیدا کنیم
                destinationCode = destination.districtCode;
                const district = districts.find(
                  (d) => d.code === destinationCode
                );
                destinationText = district
                  ? `${district.name} (${destinationCode})`
                  : destinationCode;
              } else if (destination.code) {
                // اگر فقط کد داریم، سعی کنیم نام منطقه را پیدا کنیم
                destinationCode = destination.code;
                const district = districts.find(
                  (d) => d.code === destinationCode
                );
                destinationText = district
                  ? `${district.name} (${destinationCode})`
                  : destinationCode;
              } else if (destination.name) {
                destinationText = destination.name;
              } else {
                // اگر ساختار متفاوت است، سعی کنیم اولین مقدار string را پیدا کنیم
                destinationText =
                  Object.values(destination).find(
                    (val) => typeof val === "string"
                  ) || "نامشخص";
              }

              // تبدیل نوع انتقال از انگلیسی به فارسی
              if (destination.transferType) {
                switch (destination.transferType) {
                  case "permanent_preferred":
                    transferTypeText = "دائم یا موقت با اولویت دائم";
                    break;
                  case "permanent_only":
                    transferTypeText = "فقط دائم";
                    break;
                  case "temporary_only":
                    transferTypeText = "فقط موقت";
                    break;
                  default:
                    transferTypeText = "دائم یا موقت با اولویت دائم";
                }
              }
            } else if (typeof destination === "string") {
              // اگر string است، بررسی کنیم که آیا کد منطقه است یا نه
              destinationCode = destination;
              const district = districts.find((d) => d.code === destination);
              if (district) {
                destinationText = `${district.name} (${destination})`;
              } else {
                destinationText = destination;
              }
            }
          } else {
            // اولویت خالی
            destinationText = "انتخاب نشده";
            destinationCode = null;
          }

          priorities.push({
            priority: i,
            destination: destinationText,
            destinationCode: destinationCode,
            transferType: transferTypeText,
          });
        }
      }

      setDestinationPriorities(priorities);
      setCanEditDestination(userSpecs.canEditDestination || false);

      // تنظیم initial state برای انواع انتقال
      const initialTransferTypes = {};
      priorities.forEach((priority) => {
        initialTransferTypes[priority.priority] = priority.transferType;
      });
      setTransferTypes(initialTransferTypes);
      setHasChangesStep4(false); // ریست کردن تغییرات
    } catch (error) {
      console.error("Error processing destination priorities:", error);
      toast.error("خطا در دریافت اولویت‌های مقصد");
    }
  };

  // بررسی اینکه آیا کاربر مجاز به انتخاب بند است
  const canSelectReason = (reason) => {
    if (
      !reason.isRequireMedicalCommission ||
      reason.isRequireMedicalCommission === "not_applicable"
    ) {
      return true; // همیشه مجاز
    }

    const userVerdict = userSpecs?.medicalCommissionVerdict;
    const hasVerdict = userVerdict && userVerdict.trim() !== "";

    if (reason.isRequireMedicalCommission === "required") {
      return hasVerdict; // فقط اگر رای داشته باشد
    } else if (reason.isRequireMedicalCommission === "not_required") {
      return !hasVerdict; // فقط اگر رای نداشته باشد
    }

    return true;
  };

  // دریافت پیام مناسب برای انتخاب بند
  const getSelectionMessage = (reason, isSelecting) => {
    if (
      !reason.isRequireMedicalCommission ||
      reason.isRequireMedicalCommission === "not_applicable"
    ) {
      return null;
    }

    const userVerdict = userSpecs?.medicalCommissionVerdict;
    const hasVerdict = userVerdict && userVerdict.trim() !== "";

    if (isSelecting) {
      if (reason.isRequireMedicalCommission === "required") {
        if (hasVerdict) {
          return {
            type: "success",
            message:
              "✅ شما واجد شرایط این بند هستید زیرا رای کمیسیون پزشکی دارید",
          };
        }
      } else if (reason.isRequireMedicalCommission === "not_required") {
        if (!hasVerdict) {
          return {
            type: "success",
            message:
              "✅ شما واجد شرایط این بند هستید زیرا رای کمیسیون پزشکی ندارید",
          };
        }
      }
    }

    return null;
  };

  // بررسی وضعیت کمیسیون پزشکی
  const checkMedicalCommissionRequirement = (reason, reasonId) => {
    if (
      !reason.isRequireMedicalCommission ||
      reason.isRequireMedicalCommission === "not_applicable"
    ) {
      // اگر کمیسیون پزشکی مهم نیست، هشدار را حذف کن
      setMedicalCommissionWarnings((prev) =>
        prev.filter((w) => w.reasonId !== reasonId)
      );
      return;
    }

    const userVerdict = userSpecs?.medicalCommissionVerdict;

    if (reason.isRequireMedicalCommission === "required") {
      // نیاز به کمیسیون پزشکی دارد - باید رای داشته باشد
      if (!userVerdict || userVerdict.trim() === "") {
        const warning =
          "این بند نیازمند رای کمیسیون پزشکی است اما شما رای کمیسیون پزشکی ندارید";
        setMedicalCommissionWarnings((prev) => [
          ...prev.filter((w) => w.reasonId !== reasonId),
          {
            reasonId,
            message: warning,
            type: "required_missing",
          },
        ]);
      } else {
        // رای موجود است، هشدار را حذف کن
        setMedicalCommissionWarnings((prev) =>
          prev.filter((w) => w.reasonId !== reasonId)
        );
      }
    } else if (reason.isRequireMedicalCommission === "not_required") {
      // نیاز به کمیسیون پزشکی ندارد - اگر رای دارد، هشدار بده
      if (userVerdict && userVerdict.trim() !== "") {
        const warning =
          "این بند نیازی به رای کمیسیون پزشکی ندارد اما شما رای کمیسیون پزشکی دارید";
        setMedicalCommissionWarnings((prev) => [
          ...prev.filter((w) => w.reasonId !== reasonId),
          {
            reasonId,
            message: warning,
            type: "not_required_exists",
          },
        ]);
      } else {
        // رای موجود نیست، هشدار را حذف کن
        setMedicalCommissionWarnings((prev) =>
          prev.filter((w) => w.reasonId !== reasonId)
        );
      }
    }
  };

  // انتخاب/لغو انتخاب دلیل انتقال
  const handleReasonSelection = (reasonId, isSelected) => {
    const reason = transferReasons.find((r) => r._id === reasonId);
    if (!reason) return;

    // بررسی مجاز بودن انتخاب
    if (isSelected && !canSelectReason(reason)) {
      const userVerdict = userSpecs?.medicalCommissionVerdict;
      const hasVerdict = userVerdict && userVerdict.trim() !== "";

      let errorMessage = "";
      if (reason.isRequireMedicalCommission === "required" && !hasVerdict) {
        errorMessage =
          "❌ شما نمی‌توانید این بند را انتخاب کنید زیرا نیازمند رای کمیسیون پزشکی است اما شما رای ندارید";
      } else if (
        reason.isRequireMedicalCommission === "not_required" &&
        hasVerdict
      ) {
        errorMessage =
          "❌ شما نمی‌توانید این بند را انتخاب کنید زیرا این بند نیازی به رای کمیسیون پزشکی ندارد اما شما رای دارید";
      }

      toast.error(errorMessage);
      return;
    }

    const newSelectedReasons = new Set(selectedReasons);

    if (isSelected) {
      // نمایش پیام موفقیت
      // const selectionMessage = getSelectionMessage(reason, true);
      // if (selectionMessage) {
      //   toast.success(selectionMessage.message);
      // }
      newSelectedReasons.add(reasonId);

      // بررسی محدودیت سنوات
      if (reason.hasYearsLimit && userSpecs) {
        const userYears = parseInt(userSpecs.effectiveYears || 0);
        const requiredYears = reason.yearsLimit;

        if (userYears < requiredYears) {
          const warning = `سنوات مؤثر جهت استفاده از این بند حداقل ${requiredYears} سال می باشد`;
          setYearsWarnings((prev) => [
            ...prev.filter((w) => w.reasonId !== reasonId),
            {
              reasonId,
              message: warning,
              userYears,
              requiredYears,
            },
          ]);
        } else {
          // حذف هشدار در صورت کافی بودن سنوات
          setYearsWarnings((prev) =>
            prev.filter((w) => w.reasonId !== reasonId)
          );
        }
      }

      // بررسی وضعیت کمیسیون پزشکی
      if (userSpecs) {
        checkMedicalCommissionRequirement(reason, reasonId);
      }
    } else {
      newSelectedReasons.delete(reasonId);
      setYearsWarnings((prev) => prev.filter((w) => w.reasonId !== reasonId));
      setMedicalCommissionWarnings((prev) =>
        prev.filter((w) => w.reasonId !== reasonId)
      );

      // حذف اطلاعات مربوط به این دلیل
      if (reason.requiresDocumentUpload) {
        setUploadedDocuments((prev) => {
          const newDocs = { ...prev };
          delete newDocs[reasonId];
          return newDocs;
        });
      }

      if (reason.isCulturalCouple) {
        setCulturalCoupleInfo({
          personnelCode: "",
          districtCode: "",
          districtName: "",
          spouseDistrictOpinion: "",
          spouseDistrictDescription: "",
        });
      }
    }

    setSelectedReasons(newSelectedReasons);
  };

  // بررسی آمادگی برای رفتن به مرحله بعد
  const canProceedFromStep3 = () => {
    if (selectedReasons.size === 0) return false;

    // بررسی مدارک برای دلایل نیازمند
    for (const reasonId of selectedReasons) {
      const reason = transferReasons.find((r) => r._id === reasonId);
      if (reason?.requiresDocumentUpload) {
        const docs = uploadedDocuments[reasonId] || [];
        if (docs.length < 1 || docs.length > reason.requiredDocumentsCount) {
          return false;
        }
      }

      // بررسی زوج فرهنگی
      if (reason?.isCulturalCouple) {
        if (
          !culturalCoupleInfo.personnelCode ||
          culturalCoupleInfo.personnelCode.length !== 8 ||
          !culturalCoupleInfo.districtCode
        ) {
          return false;
        }
      }
    }

    return true;
  };

  // ذخیره درخواست تجدیدنظر
  const saveAppealRequest = async (status = "draft") => {
    try {
      setSavingRequest(true);

      const requestData = {
        selectedReasons: Array.from(selectedReasons),
        uploadedDocuments: uploadedDocuments,
        culturalCoupleInfo:
          culturalCoupleInfo.personnelCode || culturalCoupleInfo.districtCode
            ? culturalCoupleInfo
            : null,
        yearsWarnings: yearsWarnings,
        medicalCommissionWarnings: medicalCommissionWarnings,
        userComments: userComments.trim() || null, // توضیحات کاربر
        userCommentsImages: userCommentsImages, // تصاویر توضیحات کاربر
        currentStep: currentStep,
        status: status,
      };

      const response = await fetch("/api/transfer-applicant/appeal-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        if (status === "submitted") {
          toast.success("درخواست تجدیدنظر با موفقیت ارسال شد");
        } else {
          toast.success("درخواست ذخیره شد");
        }
        return true;
      } else {
        toast.error(data.error || "خطا در ذخیره درخواست");
        return false;
      }
    } catch (error) {
      console.error("Error saving appeal request:", error);
      toast.error("خطا در ذخیره درخواست");
      return false;
    } finally {
      setSavingRequest(false);
    }
  };

  // بارگذاری مدارک
  const handleDocumentUpload = async (
    reasonId,
    fileIndex,
    file,
    isCommentsImage = false
  ) => {
    if (!file) return;

    // اعتبارسنجی فرمت فایل
    const allowedFormats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedFormats.includes(file.type)) {
      toast.error("فرمت فایل مجاز نیست. فرمت‌های مجاز: JPG, PNG");
      return;
    }

    // اعتبارسنجی حجم فایل
    const maxSize = isCommentsImage ? 2 * 1024 * 1024 : 1 * 1024 * 1024; // 2MB برای تصاویر توضیحات، 1MB برای مدارک
    if (file.size > maxSize) {
      const maxSizeText = isCommentsImage ? "2 مگابایت" : "1 مگابایت";
      toast.error(`حجم فایل نباید بیشتر از ${maxSizeText} باشد`);
      return;
    }

    try {
      setUploadingDocument(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/transfer-applicant/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        if (isCommentsImage) {
          // اضافه کردن تصویر به لیست تصاویر توضیحات کاربر
          const newImage = {
            fileName: data.fileName,
            originalName: file.name,
            uploadedAt: new Date(),
          };
          setUserCommentsImages((prev) => [...prev, newImage]);
          toast.success("تصویر با موفقیت بارگذاری شد");
        } else {
          // اضافه کردن فایل به لیست مدارک
          setUploadedDocuments((prev) => {
            const reasonDocs = prev[reasonId] || [];
            const newDocs = [...reasonDocs];
            newDocs[fileIndex] = {
              fileName: data.fileName,
              originalName: file.name,
              uploadedAt: new Date(),
            };
            return {
              ...prev,
              [reasonId]: newDocs,
            };
          });
          toast.success("فایل با موفقیت بارگذاری شد");
        }
      } else {
        toast.error(data.error || "خطا در بارگذاری فایل");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("خطا در بارگذاری فایل");
    } finally {
      setUploadingDocument(false);
    }
  };

  // حذف مدرک
  const removeDocument = (reasonId, fileIndex) => {
    setUploadedDocuments((prev) => {
      const reasonDocs = prev[reasonId] || [];
      const newDocs = reasonDocs.filter((_, index) => index !== fileIndex);
      return {
        ...prev,
        [reasonId]: newDocs,
      };
    });
    toast.success("مدرک حذف شد");
  };

  // بررسی و نمایش دلیل غیرفعال بودن دکمه
  const checkAndShowDisabledReason = () => {
    if (selectedReasons.size === 0) {
      toast.error("لطفاً حداقل یک دلیل انتقال را انتخاب کنید");
      return;
    }

    // بررسی مدارک برای دلایل نیازمند
    for (const reasonId of selectedReasons) {
      const reason = transferReasons.find((r) => r._id === reasonId);
      if (reason?.requiresDocumentUpload) {
        const docs = uploadedDocuments[reasonId] || [];
        if (docs.length < 1) {
          toast.error(
            `لطفاً مدارک مورد نیاز برای "${reason.title} - ${reason.reasonTitle}" را بارگذاری کنید`
          );
          return;
        }
        if (docs.length > reason.requiredDocumentsCount) {
          toast.error(
            `تعداد مدارک برای "${reason.title} - ${reason.reasonTitle}" بیش از حد مجاز است`
          );
          return;
        }
      }

      // بررسی زوج فرهنگی
      if (reason?.isCulturalCouple) {
        if (!culturalCoupleInfo.personnelCode) {
          toast.error(
            `لطفاً کد پرسنلی همسر را برای "${reason.title} - ${reason.reasonTitle}" وارد کنید`
          );
          return;
        }
        if (culturalCoupleInfo.personnelCode.length !== 8) {
          toast.error("کد پرسنلی همسر باید دقیقاً 8 رقم باشد");
          return;
        }
        if (!culturalCoupleInfo.districtCode) {
          toast.error(
            `لطفاً منطقه همسر را برای "${reason.title} - ${reason.reasonTitle}" انتخاب کنید`
          );
          return;
        }
      }
    }

    // اگر همه چیز درست است
    toast.info("تمام اطلاعات تکمیل شده است. می‌توانید ادامه دهید.");
  };

  // تغییر نوع انتقال برای اولویت مشخص
  const handleTransferTypeChange = (priority, newType) => {
    setTransferTypes((prev) => ({
      ...prev,
      [priority]: newType,
    }));
    setHasChangesStep4(true);
  };

  // تغییر مقصد برای اولویت مشخص
  const handleDestinationChange = (priority, newDestinationCode) => {
    const district = districts.find((d) => d.code === newDestinationCode);
    const destinationText = district
      ? `${district.name} (${newDestinationCode})`
      : newDestinationCode;

    setDestinationPriorities((prev) => {
      const updated = prev.map((item) => {
        if (item.priority === priority) {
          // به‌روزرسانی اولویت فعلی
          return {
            ...item,
            destination: destinationText,
            destinationCode: newDestinationCode,
          };
        } else if (
          item.destinationCode === newDestinationCode &&
          newDestinationCode !== ""
        ) {
          // اگر این منطقه در اولویت دیگری انتخاب شده بود، آن را خالی کن
          return {
            ...item,
            destination: "انتخاب نشده",
            destinationCode: "",
          };
        }
        return item;
      });

      // اگر منطقه خالی شد، اولویت‌های بعدی را هم خالی کن
      if (newDestinationCode === "") {
        // خالی کردن نوع انتقال برای اولویت فعلی و بعدی‌ها
        setTransferTypes((prev) => {
          const newTypes = { ...prev };
          // حذف نوع انتقال برای اولویت فعلی
          delete newTypes[priority];
          // حذف نوع انتقال برای اولویت‌های بعدی
          for (let i = priority + 1; i <= 7; i++) {
            delete newTypes[i];
          }
          return newTypes;
        });

        return updated.map((item) => {
          if (item.priority > priority) {
            return {
              ...item,
              destination: "انتخاب نشده",
              destinationCode: "",
            };
          }
          return item;
        });
      }

      return updated;
    });

    setHasChangesStep4(true);
  };

  // ذخیره تغییرات مرحله 4
  const saveStep4Changes = async () => {
    if (!hasChangesStep4) {
      toast.info("تغییری برای ذخیره وجود ندارد");
      return;
    }

    setSavingStep4(true);

    try {
      // آماده‌سازی داده‌ها برای ارسال
      const dataToSave = destinationPriorities.map((item) => ({
        priority: item.priority,
        destinationCode: item.destinationCode || "", // اطمینان از ارسال رشته خالی
        transferType: transferTypes[item.priority] || item.transferType || "",
      }));

      console.log("Data to save:", dataToSave);
      console.log("Transfer types:", transferTypes);

      const response = await fetch(
        "/api/transfer-applicant/update-destination-priorities",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destinationPriorities: dataToSave,
            transferTypes: transferTypes,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("تغییرات با موفقیت ذخیره شد");
        setHasChangesStep4(false);
        // به‌روزرسانی userSpecs با داده‌های جدید
        if (result.data) {
          setUserSpecs(result.data);
        }
      } else {
        toast.error(result.error || "خطا در ذخیره تغییرات");
      }
    } catch (error) {
      console.error("Error saving step 4 changes:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setSavingStep4(false);
    }
  };

  // بارگذاری تصویر توضیحات کاربر
  const handleUploadCommentsImage = async (file) => {
    if (!file) return;

    // بررسی تعداد تصاویر (حداکثر 2)
    if (userCommentsImages.length >= 2) {
      toast.error("حداکثر 2 تصویر قابل بارگذاری است");
      return;
    }

    // استفاده از تابع موجود بارگذاری مدارک
    // از reasonId خاص برای توضیحات کاربر استفاده می‌کنیم
    const commentsReasonId = "user_comments";
    const fileIndex = userCommentsImages.length;

    // فراخوانی تابع موجود
    await handleDocumentUpload(commentsReasonId, fileIndex, file, true);
  };

  // حذف تصویر توضیحات کاربر
  const handleRemoveCommentsImage = (index) => {
    setUserCommentsImages((prev) => prev.filter((_, i) => i !== index));
    toast.success("تصویر حذف شد");
  };

  // رفتن به مرحله بعد
  const proceedToNextStep = async () => {
    if (!canProceedFromStep3()) {
      checkAndShowDisabledReason();
      return;
    }

    // نمایش هشدارها (در صورت وجود)
    const hasYearsWarnings = yearsWarnings.length > 0;
    const hasMedicalWarnings = medicalCommissionWarnings.length > 0;

    if (hasYearsWarnings || hasMedicalWarnings) {
      let warningMessages = [];

      if (hasYearsWarnings) {
        warningMessages.push("⚠️ هشدارهای سنوات:");
        warningMessages.push(...yearsWarnings.map((w) => `• ${w.message}`));
        warningMessages.push("");
      }

      if (hasMedicalWarnings) {
        warningMessages.push("🏥 هشدارهای کمیسیون پزشکی:");
        warningMessages.push(
          ...medicalCommissionWarnings.map((w) => `• ${w.message}`)
        );
      }

      const confirmed = window.confirm(
        `توجه: موارد زیر برای انتخاب‌های شما اعمال می‌شود:\n\n${warningMessages.join(
          "\n"
        )}\n\nآیا مایل به ادامه هستید؟`
      );

      if (!confirmed) {
        return;
      }
    }

    // ذخیره درخواست به عنوان draft
    const saved = await saveAppealRequest("draft");
    if (saved) {
      setCurrentStep(4);
    }
  };

  // بررسی دسترسی
  if (!userLoading && (!user || user.role !== "transferApplicant")) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length !== 11) {
      toast.error("شماره همراه باید 11 رقم باشد");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("کد تایید ارسال شد");
        setCodeSent(true);
        setTimeLeft(120); // 2 minutes
      } else {
        toast.error(data.message || "خطا در ارسال کد");
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast.error("خطا در ارسال کد تایید");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 5) {
      toast.error("کد تایید باید 5 رقم باشد");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/users/phone/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("شماره همراه با موفقیت تایید شد");
        setShowVerificationModal(false);
        // Set current step to 1 (Rules and Regulations)
        setCurrentStep(1);
        // Refresh user data to get updated phoneVerified status
        window.location.reload();
      } else {
        toast.error(data.message || "کد تایید نامعتبر است");
      }
    } catch (error) {
      console.error("Error verifying SMS:", error);
      toast.error("خطا در تایید کد");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseModal = () => {
    setShowVerificationModal(false);
    setCodeSent(false);
    setVerificationCode("");
    setTimeLeft(0);
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  // اگر کاربر احراز هویت نشده باشد
  if (!user?.phoneVerified) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <div className="flex items-center gap-4 text-white">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FaArrowRight className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      درخواست تجدیدنظر در نتیجه انتقال
                    </h1>
                    <p className="text-orange-100 text-sm">
                      سیستم ثبت درخواست تجدیدنظر در نتیجه انتقال پرسنل
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Verification Required */}
            <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden">
              <div className="p-8">
                <div className="text-center">
                  <div className="bg-orange-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FaShieldAlt className="h-10 w-10 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    احراز هویت ضروری است
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    برای دسترسی به امکانات سامانه، انجام فرآیند احراز هویت از
                    طریق شماره تلفن همراه ثبت شده در سامانه الزامی است.
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-3 relative">
                      <div className="text-sm text-yellow-800 flex flex-col items-center gap-1 ">
                        <FaExclamationTriangle className="h-5 w-5 text-yellow-600 absolute right-0 top-0 " />
                        <div className="flex items-center gap-2">
                          <p className="font-medium mb-1">توجه مهم:</p>
                        </div>
                        <p className="text-right">
                          شماره همراه شما در سیستم ثبت شده:{" "}
                          <span className="font-bold" dir="ltr">
                            {maskPhoneNumber(user?.phone)}
                          </span>
                        </p>
                        <p className="mt-1 text-right">
                          درصورت نیاز به اصلاح شماره همراه، از طریق مسئول امور
                          اداری اداره مبدأ اصلی محل خدمت اقدام فرمائید..
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg"
                  >
                    <FaPhone className="h-5 w-5" />
                    شروع احراز هویت
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <FaPhone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        احراز هویت شماره همراه
                      </h3>
                      <p className="text-orange-100 text-sm flex items-center gap-292">
                        تایید شماره:
                        <div dir="ltr">{maskPhoneNumber(phoneNumber)}</div>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {!codeSent ? (
                  <>
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        کد تایید به شماره همراه زیر ارسال خواهد شد:
                      </p>
                      <div
                        className="bg-gray-100 p-3 rounded-lg font-bold text-lg text-center"
                        dir="ltr"
                      >
                        {maskPhoneNumber(phoneNumber)}
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        ⚠️ امکان تغییر شماره همراه وجود ندارد
                      </p>
                    </div>

                    <button
                      onClick={handleSendCode}
                      disabled={isVerifying}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <FaSpinner className="animate-spin h-5 w-5" />
                      ) : (
                        <FaPhone className="h-5 w-5" />
                      )}
                      {isVerifying ? "در حال ارسال..." : "ارسال کد تایید"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <FaCheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-gray-600 mb-4 text-center">
                        کد تایید به شماره{" "}
                        <span className="font-bold" dir="ltr">
                          {maskPhoneNumber(phoneNumber)}
                        </span>{" "}
                        ارسال شد
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                        کد تایید (5 رقم)
                      </label>

                      {/* Input boxes container */}
                      <div className="flex justify-center gap-3 mb-4" dir="ltr">
                        {[...Array(5)].map((_, index) => (
                          <div key={index} className="relative">
                            <input
                              type="text"
                              maxLength="1"
                              value={verificationCode[index] || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 1) {
                                  const newCode = verificationCode.split("");
                                  newCode[index] = value;
                                  const finalCode = newCode
                                    .join("")
                                    .slice(0, 5);
                                  setVerificationCode(finalCode);

                                  // Auto focus next input (left to right)
                                  if (value && index < 4) {
                                    const nextInput = document.querySelector(
                                      `input[data-index="${index + 1}"]`
                                    );
                                    if (nextInput) nextInput.focus();
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Handle backspace (right to left navigation)
                                if (
                                  e.key === "Backspace" &&
                                  !verificationCode[index] &&
                                  index > 0
                                ) {
                                  const prevInput = document.querySelector(
                                    `input[data-index="${index - 1}"]`
                                  );
                                  if (prevInput) prevInput.focus();
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              data-index={index}
                              className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 bg-white
                                ${
                                  verificationCode[index]
                                    ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md"
                                    : "border-gray-300 hover:border-gray-400 focus:border-orange-500"
                                }
                                focus:ring-2 focus:ring-orange-500/20 focus:outline-none
                                ${
                                  index === verificationCode.length &&
                                  !verificationCode[index]
                                    ? "border-orange-400 ring-2 ring-orange-500/30"
                                    : ""
                                }`}
                              dir="ltr"
                              autoComplete="one-time-code"
                            />

                            {/* Active indicator */}
                            {index === verificationCode.length &&
                              !verificationCode[index] && (
                                <div className="absolute inset-0 border-2 border-orange-500 rounded-xl animate-pulse pointer-events-none"></div>
                              )}

                            {/* Success checkmark */}
                            {verificationCode[index] && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <FaCheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Hidden input for paste functionality */}
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 5);
                          setVerificationCode(value);
                          if (value.length === 5) {
                            e.target.blur();
                          }
                        }}
                        className="opacity-0 absolute -z-10"
                        placeholder="Paste code here"
                      />

                      <p className="text-xs text-gray-500 text-center">
                        کد 5 رقمی ارسال شده را وارد کنید
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyCode}
                        disabled={isVerifying || verificationCode.length !== 5}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <FaSpinner className="animate-spin h-5 w-5" />
                        ) : (
                          <FaCheckCircle className="h-5 w-5" />
                        )}
                        {isVerifying ? "در حال تایید..." : "تایید کد"}
                      </button>

                      <button
                        onClick={handleSendCode}
                        disabled={isVerifying || timeLeft > 0}
                        className="px-6 py-3 border border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {timeLeft > 0 ? (
                          <>
                            <FaClock className="h-4 w-4" />
                            <span dir="ltr">{timeLeft}s</span>
                          </>
                        ) : (
                          <>
                            <FaRedo className="h-4 w-4" />
                            ارسال مجدد
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // بررسی محدودیت دسترسی
  if (accessRestricted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
              <div className="flex items-center gap-4 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaExclamationTriangle className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">محدودیت دسترسی</h1>
                  <p className="text-red-100 text-sm">
                    مهلت ثبت درخواست تجدیدنظر به پایان رسیده است
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-red-800 mb-2">
                      عدم امکان دسترسی
                    </h3>
                    <p className="text-red-700 text-sm leading-relaxed">
                      {restrictionMessage}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => window.history.back()}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  بازگشت
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // اگر کاربر احراز هویت شده باشد - نمایش مراحل درخواست انتقال

  // اگر هنوز وضعیت اولیه چک نشده، loading نمایش بده
  if (!initialStatusChecked && user?.phoneVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
              <div className="flex items-center gap-4 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaArrowRight className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    درخواست تجدیدنظر در نتیجه انتقال
                  </h1>
                  <p className="text-blue-100 text-sm">در حال بررسی وضعیت...</p>
                </div>
              </div>
            </div>
            <div className="p-8 text-center">
              <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">در حال بررسی وضعیت درخواست شما...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // اگر وضعیت درخواست نیاز به نمایش فقط خواندنی دارد
  if (showReadOnlyView && userSpecs) {
    return (
      <ReadOnlyRequestView
        userSpecs={userSpecs}
        onBack={() => setShowReadOnlyView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaArrowRight className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  درخواست تجدیدنظر در نتیجه انتقال
                </h1>
                <p className="text-blue-100 text-sm">
                  ثبت درخواست تجدیدنظر در نتیجه انتقال داخل استان پرسنل
                </p>
              </div>
              <div className="mr-auto bg-green-500/20 px-3 py-1 rounded-lg">
                <div className="flex items-center gap-2 text-green-100">
                  <FaCheckCircle className="h-4 w-4" />
                  <span className="text-sm">احراز هویت شده</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* راهنمای کاربری */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-orange-500 text-white p-2 rounded-lg flex-shrink-0">
              <FaInfoCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 mb-2">تذکر مهم :</h3>
              <p className="text-orange-700 text-sm leading-relaxed text-justify">
                همکار محترم، ثبت درخواست تجدیدنظر در نتیجه انتقال داخل استان و
                پیگیری نتیجه آن، صرفاً از طریق همین سامانه انجام می شود؛ لذا
                ضروری است از مراجعه حضوری به ادارات آموزش و پرورش خودداری شود.
                ضمناً پس از ثبت درخواست، امکان گفتگو با کارشناسان مربوطه (درصورت
                ضرورت) به صورت آنلاین از طریق همین سامانه فراهم می باشد. لازم به
                ذکر است نتایج نهایی تجدیدنظر پس از تصویب کارگروه اداره کل، علاوه
                بر اعلام در این سامانه، در سامانه وزارتی my.medu.ir نیز ثبت
                خواهد شود.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={handleGoBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaArrowRight className="h-4 w-4" />
                    بازگشت
                  </button>
                )}
                {currentStep > 1 && (
                  <button
                    onClick={handleResetProcess}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaRedo className="h-4 w-4" />
                    شروع مجدد
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                مرحله {currentStep} از 6
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-4">
              <div
                className={`flex flex-col items-center ${
                  currentStep >= 1 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 1
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 1 ? "✓" : "1"}
                </div>
                <span className="text-xs text-center mt-1">قوانین</span>
              </div>

              <div
                className={`flex flex-col items-center ${
                  currentStep >= 2 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 2
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 2 ? "✓" : "2"}
                </div>
                <span className="text-xs text-center mt-1">مشخصات</span>
              </div>

              <div
                className={`flex flex-col items-center ${
                  currentStep >= 3 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 3
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 3 ? "✓" : "3"}
                </div>
                <span className="text-xs text-center mt-1">فرم تجدید نظر</span>
              </div>

              <div
                className={`flex flex-col items-center ${
                  currentStep >= 4 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 4
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 4 ? "✓" : "4"}
                </div>
                <span className="text-xs text-center mt-1">نوع انتقال</span>
              </div>

              <div
                className={`flex flex-col items-center ${
                  currentStep >= 5 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 5
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 5 ? "✓" : "5"}
                </div>
                <span className="text-xs text-center mt-1">پیش نمایش</span>
              </div>

              <div
                className={`flex flex-col items-center ${
                  currentStep >= 6 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    currentStep >= 6
                      ? "border-blue-600 bg-blue-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {currentStep > 6 ? "✓" : "6"}
                </div>
                <span className="text-xs text-center mt-1">تایید نهایی</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaShieldAlt className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    مرحله اول: قوانین و مقررات
                  </h2>
                  <p className="text-blue-100 text-sm">
                    همکار گرامی، جهت ثبت درخواست باید قوانین و نکات زیر را
                    مطالعه نموده و تایید بفرمائید.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingNotices ? (
                <div className="flex justify-center items-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-blue-500" />
                  <span className="mr-3 text-gray-600">
                    در حال بارگذاری قوانین...
                  </span>
                </div>
              ) : preliminaryNotices.length === 0 ? (
                <div className="text-center py-12">
                  <FaShieldAlt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    هیچ قانونی یافت نشد
                  </h3>
                  <p className="text-gray-500">
                    در حال حاضر قوانین و مقرراتی برای نمایش وجود ندارد.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* دکمه دانلود ضوابط و شرایط دستورالعمل تجدیدنظر */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            ضوابط و شرایط دستورالعمل تجدیدنظر
                          </h4>
                          <p className="text-sm text-gray-600">
                            مطالعه این فایل جهت اطلاع از قوانین و ضوابط ضروری
                            است
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // ایجاد لینک موقت برای دانلود
                          const link = document.createElement("a");
                          link.href = "/attachments/reqrule.pdf";
                          link.download =
                            "ضوابط_و_شرایط_دستورالعمل_تجدیدنظر.pdf";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        دانلود PDF
                      </button>
                    </div>
                  </div>

                  {preliminaryNotices.map((notice) => (
                    <div
                      key={notice._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="block text-sm font-medium text-gray-900">
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mb-2">
                              {notice.code}
                            </span>
                            <br />
                            {notice.title}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() =>
                              handleNoticeAcceptance(
                                notice._id,
                                !acceptedNotices.has(notice._id)
                              )
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              acceptedNotices.has(notice._id)
                                ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {acceptedNotices.has(notice._id)
                              ? "✓ مطالعه کردم و پذیرفتم"
                              : "مطالعه کردم و پذیرفتم"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {acceptedNotices.size} از {preliminaryNotices.length}{" "}
                        قانون تایید شده
                      </div>
                      <button
                        onClick={handleProceedToNextStep}
                        disabled={
                          acceptedNotices.size !== preliminaryNotices.length
                        }
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                      >
                        ادامه به مرحله بعد
                        <FaArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaArrowRight className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">مرحله دوم: نمایش مشخصات</h2>
                  <p className="text-green-100 text-sm">
                    بررسی و تایید مشخصات شخصی و شغلی
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingSpecs ? (
                <div className="flex justify-center items-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-green-500" />
                  <span className="mr-3 text-gray-600">
                    در حال بارگذاری مشخصات...
                  </span>
                </div>
              ) : !userSpecs ? (
                <div className="text-center py-12">
                  <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FaTimes className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    مشخصات یافت نشد
                  </h3>
                  <p className="text-gray-600 mb-6">
                    مشخصات شما در سیستم ثبت نشده است. لطفاً با پشتیبانی تماس
                    بگیرید.
                  </p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    بازگشت به مرحله قبل
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* مشخصات فردی */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                      <FaShieldAlt className="h-5 w-5" />
                      مشخصات فردی
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نام
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.firstName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نام خانوادگی
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.lastName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          کد پرسنلی (۸ رقم)
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900 font-mono">
                          {userSpecs.personnelCode}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          کد ملی (۱۰-۸ رقم)
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900 font-mono">
                          {userSpecs.nationalId}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          جنسیت
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.gender === "male" ? "مرد" : "زن"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          تلفن همراه (۱۱ رقم)
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900 font-mono">
                          {userSpecs.mobile}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* مشخصات شغلی */}
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                      <FaArrowRight className="h-5 w-5" />
                      مشخصات شغلی
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نوع استخدام
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.employmentType === "official"
                            ? "رسمی"
                            : userSpecs.employmentType === "contractual"
                            ? "پیمانی"
                            : userSpecs.employmentType === "adjunct"
                            ? "حق التدریس"
                            : userSpecs.employmentType === "contract"
                            ? "قراردادی"
                            : userSpecs.employmentType === "trial"
                            ? "آزمایشی"
                            : userSpecs.employmentType}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          رشته استخدامی
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.employmentField}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          جمع امتیاز تایید شده
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.approvedScore}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          سنوات مؤثر(تا تاریخ 14040631)
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.effectiveYears}
                        </div>
                      </div>
                      {userSpecs.medicalCommissionVerdict && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            رای کمیسیون پزشکی
                          </label>
                          <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                            {userSpecs.medicalCommissionVerdict}
                          </div>
                        </div>
                      )}
                      {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نوع انتقال تقاضا
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.requestedTransferType === "temporary"
                            ? "موقت"
                            : "دائم"}
                        </div>
                      </div> */}
                    </div>
                  </div>

                  {/* اطلاعات مکانی */}
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                      <FaShieldAlt className="h-5 w-5" />
                      اطلاعات منطقه اصلی محل خدمت(مبدا انتقال)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نام منطقه اصلی محل خدمت(مبدا انتقال)
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900 font-mono">
                          {userSpecs.districtName || "نام منطقه یافت نشد"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          کد محل خدمت
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900 font-mono">
                          {userSpecs.currentWorkPlaceCode}
                        </div>
                      </div>
                      {/* <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          نام منطقه
                        </label>
                        <div className="bg-white p-3 rounded-lg border border-gray-300 text-gray-900">
                          {userSpecs.districtName || "نام منطقه یافت نشد"}
                        </div>
                      </div> */}
                    </div>
                  </div>

                  {/* نمایش وضعیت درخواست‌های اصلاح مشخصات */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="text-lg font-semibold text-blue-800 mb-3">
                      وضعیت درخواست‌های اصلاح مشخصات
                    </h4>

                    {loadingRequests ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600 mt-2">
                          در حال بارگذاری...
                        </p>
                      </div>
                    ) : correctionRequests.length > 0 ? (
                      <>
                        {/* هشدار برای درخواست‌های pending */}
                        {hasPendingCorrectionRequest() && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="bg-yellow-100 p-2 rounded-full">
                                <FaTimes className="h-4 w-4 text-yellow-600" />
                              </div>
                              <div className="text-sm text-yellow-800">
                                <strong>توجه:</strong> شما درخواست اصلاح مشخصات
                                در انتظار دارید. تا زمان رسیدگی به این درخواست،
                                امکان تایید اطلاعات و ادامه فرآیند وجود ندارد.
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-3">
                          {correctionRequests.map((request) => (
                            <div
                              key={request._id}
                              className="bg-white border border-blue-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      فیلد مورد اعتراض:
                                    </span>
                                    <span className="text-sm text-gray-900">
                                      {getFieldDisplayName(
                                        request.disputedField
                                      )}
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        request.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : request.status === "under_review"
                                          ? "bg-blue-100 text-blue-800"
                                          : request.status === "approved"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {request.status === "pending"
                                        ? "در انتظار"
                                        : request.status === "under_review"
                                        ? "در حال بررسی"
                                        : request.status === "approved"
                                        ? "تایید شده"
                                        : "رد شده"}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      توضیحات:
                                    </span>{" "}
                                    {request.description}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    تاریخ ارسال:{" "}
                                    {new Date(
                                      request.createdAt
                                    ).toLocaleDateString("fa-IR")}
                                  </div>
                                  {request.expertResponse && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded border-r-4 border-blue-500">
                                      <div className="text-xs font-medium text-gray-700 mb-1">
                                        پاسخ کارشناس:
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {request.expertResponse}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {request.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleDeleteCorrectionRequest(request._id)
                                    }
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    حذف
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-600">
                        <p>هیچ درخواست اصلاح مشخصاتی یافت نشد.</p>
                      </div>
                    )}
                  </div>

                  {/* دکمه‌های عملیات */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                    >
                      بازگشت به مرحله قبل
                    </button>

                    <button
                      onClick={() => setShowCorrectionModal(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaTimes className="h-4 w-4" />
                      درخواست ویرایش
                    </button>

                    <button
                      onClick={handleConfirmSpecs}
                      disabled={hasPendingCorrectionRequest()}
                      className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                        hasPendingCorrectionRequest()
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      <FaCheckCircle className="h-4 w-4" />
                      {hasPendingCorrectionRequest()
                        ? "درخواست اصلاح در انتظار"
                        : "تایید و ادامه"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaCheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    مرحله سوم: فرم ثبت درخواست تجدیدنظر در نتیجه انتقال
                  </h2>
                  <p className="text-purple-100 text-sm">
                    درخواست تجدیدنظر خودرادر قالب پرسشنامه زیر ثبت نمایید.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* متن مقدمه */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  همکار گرامی؛
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  مطابق مفاد بخش «الف» دستورالعمل تجدیدنظر، ثبت درخواست تجدیدنظر
                  برای مشمولین بندهای زیر امکان پذیر است؛ لذا به منظور ثبت
                  درخواست، به سؤالات زیر به ترتیب پاسخ دهید:
                </p>
              </div>

              {/* بارگذاری دلایل انتقال */}
              {loadingTransferReasons ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="text-gray-600 mt-4">
                    در حال بارگذاری دلایل انتقال...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* لیست دلایل انتقال */}
                  {transferReasons.map((reason) => (
                    <div
                      key={reason._id}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="text-lg font-bold text-purple-800 mb-2 border-b border-purple-200 pb-2">
                              📋 {reason.title} - {reason.reasonTitle}
                            </h4>
                            {reason.description && (
                              <div className="mt-3">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                                  توضیحات:
                                </span>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                  {reason.description}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* انتخاب مشمولیت */}
                          <div className="mb-4">
                            <p className="text-gray-700 mb-3">
                              مشمول و متقاضی بررسی انتقال از طریق این بند:
                            </p>
                            <div className="flex gap-4">
                              <label
                                className={`flex items-center ${
                                  !canSelectReason(reason)
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`reason_${reason._id}`}
                                  value="yes"
                                  checked={selectedReasons.has(reason._id)}
                                  disabled={!canSelectReason(reason)}
                                  onChange={(e) =>
                                    handleReasonSelection(
                                      reason._id,
                                      e.target.checked
                                    )
                                  }
                                  className="ml-2 text-purple-600 focus:ring-purple-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                                />
                                <span
                                  className={
                                    !canSelectReason(reason)
                                      ? "text-gray-400"
                                      : "text-gray-700"
                                  }
                                >
                                  هستم
                                </span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`reason_${reason._id}`}
                                  value="no"
                                  checked={!selectedReasons.has(reason._id)}
                                  onChange={(e) =>
                                    handleReasonSelection(
                                      reason._id,
                                      !e.target.checked
                                    )
                                  }
                                  className="ml-2 text-gray-600 focus:ring-gray-500"
                                />
                                نیستم
                              </label>
                            </div>
                          </div>

                          {/* پیام عدم مجاز بودن */}
                          {!canSelectReason(reason) && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 text-red-800">
                                <FaTimesCircle className="h-5 w-5" />
                                <span className="font-medium">
                                  عدم واجد شرایط:
                                </span>
                              </div>
                              <p className="text-red-700 mt-1 text-sm">
                                {reason.isRequireMedicalCommission ===
                                "required"
                                  ? "باتوجه به اینکه برای شما قبلاً (در سال جاری) رأی کمیسیون پزشکی صادر نشده است، درصورت تمایل به استفاده از رأی کمیسیون پزشکی، گزینه متقاضی معرفی جدید به کمیسیون پزشکی (بند3 دستورالعمل - حالت3 ) را انتخاب کنید."
                                  : "باتوجه به اینکه برای شما قبلاً رأی کمیسیون پزشکی صادر شده است، مجاز به درخواست معرفی جدید به کمیسیون پزشکی نیستید. درصورت نیاز به معرفی مجدد، گزینه درخواست بازنگری در رأی صادره (بند3 دستورالعمل - حالت2 ) را انتخاب کنید."}
                              </p>
                            </div>
                          )}

                          {/* هشدار سنوات */}
                          {yearsWarnings.find(
                            (w) => w.reasonId === reason._id
                          ) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <FaExclamationTriangle className="h-5 w-5" />
                                <span className="font-medium">توجه:</span>
                              </div>
                              <p className="text-yellow-700 mt-1">
                                {
                                  yearsWarnings.find(
                                    (w) => w.reasonId === reason._id
                                  )?.message
                                }
                              </p>
                            </div>
                          )}

                          {/* هشدار کمیسیون پزشکی */}
                          {medicalCommissionWarnings.find(
                            (w) => w.reasonId === reason._id
                          ) && (
                            <div
                              className={`rounded-lg p-4 mb-4 ${
                                medicalCommissionWarnings.find(
                                  (w) => w.reasonId === reason._id
                                )?.type === "required_missing"
                                  ? "bg-red-50 border border-red-200"
                                  : "bg-orange-50 border border-orange-200"
                              }`}
                            >
                              <div
                                className={`flex items-center gap-2 ${
                                  medicalCommissionWarnings.find(
                                    (w) => w.reasonId === reason._id
                                  )?.type === "required_missing"
                                    ? "text-red-800"
                                    : "text-orange-800"
                                }`}
                              >
                                <FaUserMd className="h-5 w-5" />
                                <span className="font-medium">
                                  کمیسیون پزشکی:
                                </span>
                              </div>
                              <p
                                className={`mt-1 ${
                                  medicalCommissionWarnings.find(
                                    (w) => w.reasonId === reason._id
                                  )?.type === "required_missing"
                                    ? "text-red-700"
                                    : "text-orange-700"
                                }`}
                              >
                                {
                                  medicalCommissionWarnings.find(
                                    (w) => w.reasonId === reason._id
                                  )?.message
                                }
                              </p>
                            </div>
                          )}

                          {/* بارگذاری مدارک */}
                          {selectedReasons.has(reason._id) &&
                            reason.requiresDocumentUpload && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <h5 className="font-medium text-blue-800 mb-3">
                                  بارگذاری مدارک مورد نیاز (
                                  {reason.requiredDocumentsCount} مدرک)
                                </h5>
                                <div className="text-xs text-blue-600 mb-3">
                                  فرمت‌های مجاز: JPG, PNG | حداکثر حجم: 1
                                  مگابایت
                                </div>
                                <div className="space-y-3">
                                  {Array.from(
                                    { length: reason.requiredDocumentsCount },
                                    (_, index) => {
                                      const uploadedDoc =
                                        uploadedDocuments[reason._id]?.[index];
                                      return (
                                        <div
                                          key={index}
                                          className="border border-blue-200 rounded-lg p-3"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-blue-700">
                                              مدرک {index + 1}:
                                            </span>
                                            {uploadedDoc && (
                                              <button
                                                onClick={() =>
                                                  removeDocument(
                                                    reason._id,
                                                    index
                                                  )
                                                }
                                                className="text-red-500 hover:text-red-700 text-xs"
                                              >
                                                حذف
                                              </button>
                                            )}
                                          </div>

                                          {uploadedDoc ? (
                                            <div className="bg-green-50 border border-green-200 rounded p-2">
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-sm text-green-700">
                                                  {uploadedDoc.originalName}
                                                </span>
                                              </div>
                                              <div className="text-xs text-green-600 mt-1">
                                                بارگذاری شده در:{" "}
                                                {new Date(
                                                  uploadedDoc.uploadedAt
                                                ).toLocaleDateString("fa-IR")}
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              <input
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
                                                onChange={(e) => {
                                                  const file =
                                                    e.target.files[0];
                                                  if (file) {
                                                    handleDocumentUpload(
                                                      reason._id,
                                                      index,
                                                      file
                                                    );
                                                  }
                                                }}
                                                disabled={uploadingDocument}
                                                className="w-full text-sm text-gray-600 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                              />
                                              {uploadingDocument && (
                                                <div className="flex items-center gap-2 mt-2 text-blue-600">
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                  <span className="text-xs">
                                                    در حال بارگذاری...
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}

                          {/* فرم زوج فرهنگی */}
                          {selectedReasons.has(reason._id) &&
                            reason.isCulturalCouple && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <h5 className="font-medium text-green-800 mb-3">
                                  اطلاعات همسر فرهنگی
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-green-700 mb-2">
                                      کد پرسنلی همسر (8 رقم){" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={culturalCoupleInfo.personnelCode}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(
                                          /\D/g,
                                          ""
                                        ); // فقط اعداد
                                        if (value.length <= 8) {
                                          setCulturalCoupleInfo((prev) => ({
                                            ...prev,
                                            personnelCode: value,
                                          }));
                                        }
                                      }}
                                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                        culturalCoupleInfo.personnelCode &&
                                        culturalCoupleInfo.personnelCode
                                          .length !== 8
                                          ? "border-red-300 bg-red-50"
                                          : "border-green-300"
                                      }`}
                                      placeholder="کد پرسنلی 8 رقمی همسر"
                                      maxLength="8"
                                    />
                                    {culturalCoupleInfo.personnelCode &&
                                      culturalCoupleInfo.personnelCode
                                        .length !== 8 && (
                                        <p className="text-red-500 text-xs mt-1">
                                          کد پرسنلی باید دقیقاً 8 رقم باشد
                                        </p>
                                      )}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-green-700 mb-2">
                                      منطقه اصلی محل خدمت همسر(شاغل){" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    {loadingDistricts ? (
                                      <div className="w-full px-3 py-2 border border-green-300 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 ml-2"></div>
                                        <span className="text-sm text-gray-600">
                                          در حال بارگذاری...
                                        </span>
                                      </div>
                                    ) : (
                                      <select
                                        value={culturalCoupleInfo.districtCode}
                                        onChange={(e) =>
                                          setCulturalCoupleInfo((prev) => ({
                                            ...prev,
                                            districtCode: e.target.value,
                                            districtName:
                                              e.target.options[
                                                e.target.selectedIndex
                                              ].text,
                                          }))
                                        }
                                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      >
                                        <option value="">
                                          منطقه همسر را انتخاب کنید
                                        </option>
                                        {districts
                                          .sort((a, b) =>
                                            a.code.localeCompare(b.code)
                                          )
                                          .map((district) => (
                                            <option
                                              key={district._id}
                                              value={district.code}
                                            >
                                              {district.name} ({district.code})
                                              - {district.province.name}
                                            </option>
                                          ))}
                                      </select>
                                    )}
                                  </div>

                                  {/* نظر منطقه خدمت همسر */}
                                  {/* <div>
                                    <label className="block text-sm font-medium text-green-700 mb-2">
                                      نظر منطقه خدمت همسر{" "}
                                      <span className="text-gray-400 text-xs">
                                        (اختیاری)
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        culturalCoupleInfo.spouseDistrictOpinion
                                      }
                                      onChange={(e) =>
                                        setCulturalCoupleInfo((prev) => ({
                                          ...prev,
                                          spouseDistrictOpinion: e.target.value,
                                        }))
                                      }
                                      placeholder="نظر منطقه خدمت همسر را وارد کنید"
                                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                  </div> */}

                                  {/* توضیح منطقه خدمت همسر */}
                                  {/* <div>
                                    <label className="block text-sm font-medium text-green-700 mb-2">
                                      توضیح منطقه خدمت همسر{" "}
                                      <span className="text-gray-400 text-xs">
                                        (اختیاری)
                                      </span>
                                    </label>
                                    <textarea
                                      value={
                                        culturalCoupleInfo.spouseDistrictDescription
                                      }
                                      onChange={(e) =>
                                        setCulturalCoupleInfo((prev) => ({
                                          ...prev,
                                          spouseDistrictDescription:
                                            e.target.value,
                                        }))
                                      }
                                      placeholder="توضیحات اضافی در مورد منطقه خدمت همسر را وارد کنید"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                                    />
                                  </div> */}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* فیلد توضیحات کاربر */}
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <FaEdit className="h-5 w-5" />
                  توضیحات تکمیلی (اختیاری)
                </h4>
                <p className="text-blue-700 text-sm mb-4 leading-relaxed">
                  در صورت نیاز، می‌توانید توضیحات تکمیلی درباره درخواست انتقال
                  خود در این قسمت ارائه دهید. این توضیحات به کارشناسان کمک
                  می‌کند تا درخواست شما را بهتر بررسی کنند.
                </p>
                <textarea
                  value={userComments}
                  onChange={(e) => setUserComments(e.target.value)}
                  placeholder="توضیحات تکمیلی خود را در اینجا بنویسید..."
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-700"
                  rows={4}
                  maxLength={1000}
                />
                <div className="text-xs text-blue-600 mt-2 text-left">
                  {userComments.length}/1000 کاراکتر
                </div>

                {/* بخش بارگذاری تصاویر */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h5 className="text-md font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <FaImage className="h-4 w-4" />
                    تصاویر پیوست (اختیاری - حداکثر 2 تصویر)
                  </h5>

                  {/* نمایش تصاویر بارگذاری شده */}
                  {userCommentsImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {userCommentsImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative bg-white border border-blue-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <FaImage className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-700 truncate flex-1">
                              {image.originalName}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(image.uploadedAt).toLocaleDateString(
                              "fa-IR"
                            )}
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`/api/transfer-applicant/download-document/${image.fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                            >
                              <FaDownload className="h-3 w-3" />
                              مشاهده
                            </a>
                            <button
                              onClick={() => handleRemoveCommentsImage(index)}
                              className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                            >
                              <FaTrash className="h-3 w-3" />
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* دکمه بارگذاری تصویر */}
                  {userCommentsImages.length < 2 && (
                    <div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadCommentsImage(file);
                          }
                          e.target.value = "";
                        }}
                        className="hidden"
                        id="commentsImageUpload"
                        disabled={uploadingDocument}
                      />
                      <label
                        htmlFor="commentsImageUpload"
                        className={`inline-flex items-center gap-2 px-4 py-2 border border-blue-300 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors ${
                          uploadingDocument
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {uploadingDocument ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            در حال بارگذاری...
                          </>
                        ) : (
                          <>
                            <FaPlus className="h-4 w-4" />
                            افزودن تصویر ({userCommentsImages.length}/2)
                          </>
                        )}
                      </label>
                      <p className="text-xs text-blue-600 mt-1">
                        فرمت‌های مجاز: JPG، PNG | حداکثر حجم: 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* دکمه‌های ناوبری */}
              <div className="flex gap-3 justify-center mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaArrowRight className="h-4 w-4" />
                  بازگشت به مرحله قبل
                </button>

                <div className="relative group">
                  <button
                    onClick={() => {
                      if (canProceedFromStep3() && !savingRequest) {
                        proceedToNextStep();
                      } else if (!savingRequest) {
                        checkAndShowDisabledReason();
                      }
                    }}
                    className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 text-white ${
                      canProceedFromStep3() && !savingRequest
                        ? "bg-purple-600 hover:bg-purple-700 cursor-pointer"
                        : "bg-purple-400 cursor-pointer hover:bg-purple-500"
                    }`}
                  >
                    {savingRequest ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        ادامه به مرحله بعد
                        <FaArrowLeft className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Tooltip برای دکمه غیرفعال */}
                  {!canProceedFromStep3() && !savingRequest && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      برای مشاهده دلیل کلیک کنید
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaShieldAlt className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    مرحله چهارم: کنترل نوع انتقال
                  </h2>
                  <p className="text-indigo-100 text-sm">
                    انتخاب و تایید نوع انتقال مورد نظر
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* متن راهنما */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-gray-800 leading-relaxed mb-4">
                  {canEditDestination ? (
                    <>
                      همکار گرامی؛ شما در این بخش می‌توانید نوع انتقال مورد
                      درخواست خود را برای هریک از اولویت‌های انتخابی از طریق
                      گزینه‌های مشخص شده انتخاب نمایید.
                    </>
                  ) : (
                    <>
                      همکار گرامی؛ اولویت‌های مقصد ثبت شده شما در جدول زیر نمایش
                      داده شده است. شما می‌توانید اولویت‌های خالی را تکمیل کرده
                      و نوع انتقال مورد درخواست خود را برای هریک از اولویت‌ها
                      تغییر دهید.
                    </>
                  )}
                </p>

                {canEditDestination && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <FaInfoCircle className="h-4 w-4" />
                      نکات مهم برای انتخاب مقاصد:
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>
                        • اولویت‌ها باید به ترتیب پر شوند (ابتدا اولویت 1، سپس 2
                        و ...)
                      </li>
                      <li>• هر منطقه فقط یک بار قابل انتخاب است</li>
                      <li>
                        • پس از انتخاب منطقه در یک اولویت، آن منطقه از سایر
                        اولویت‌ها حذف می‌شود
                      </li>
                      <li>
                        • برای تغییر اولویت بالاتر، ابتدا اولویت‌های پایین‌تر را
                        خالی کنید
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              {/* تذکرها */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                <h4 className="font-bold text-yellow-800 mb-4">تذکرها:</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-yellow-700 mt-1 text-right text-nowrap ">
                      1:
                    </span>
                    <p className="text-yellow-700 text-sm leading-relaxed text-justify">
                      اولویت های شما طبق درخواست ثبت شده در سامانه my.medu.ir به
                      شرح زیر بوده و امکان تغییر در آنها در فرآیند تجدیدنظر وجود
                      ندارد؛ لکن امکان افزودن مقصد جدید به اولویت های قبلی (در
                      صورت عدم تکمیل 7 اولویت مجاز) فراهم می باشد.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-yellow-700 mt-1 text-nowrap">
                      2:
                    </span>
                    <p className="text-yellow-700 text-sm leading-relaxed text-justify">
                      درصورتیکه متقاضی تغییر نوع انتقال از دائم به موقت یا
                      بالعکس هستید، صرفنظر از اینکه در مرحله پردازشی منتقل
                      شده‌اید یا نشده‌اید، درخواست خود را از طریق گزینه‌های
                      موجود ثبت کنید.
                    </p>
                  </div>
                </div>
              </div>

              {/* جدول اولویت‌های مقصد */}
              {destinationPriorities.length > 0 ? (
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 border-b">
                          شماره اولویت
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 border-b">
                          مقصد
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 border-b">
                          نوع انتقال مورد تقاضا
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {destinationPriorities.map((priority, index) => (
                        <tr
                          key={priority.priority}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-6 py-4 text-right text-sm text-gray-900 border-b">
                            {priority.priority}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900 border-b">
                            {canEditDestination ? (
                              // کاربران با دسترسی کامل - همه اولویت‌ها قابل ویرایش
                              <div className="flex items-center gap-2">
                                <select
                                  value={priority.destinationCode || ""}
                                  onChange={(e) =>
                                    handleDestinationChange(
                                      priority.priority,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isPriorityEnabled(priority.priority)
                                  }
                                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                    !isPriorityEnabled(priority.priority)
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                      : "border-gray-300"
                                  }`}
                                >
                                  <option value="">
                                    {!isPriorityEnabled(priority.priority)
                                      ? "ابتدا اولویت قبلی را انتخاب کنید"
                                      : "منطقه را انتخاب کنید"}
                                  </option>
                                  {isPriorityEnabled(priority.priority) &&
                                    getAvailableDistrictsForPriority(
                                      priority.priority
                                    ).map((district) => (
                                      <option
                                        key={district._id}
                                        value={district.code}
                                      >
                                        {district.name} ({district.code}) -{" "}
                                        {district.province.name}
                                      </option>
                                    ))}
                                </select>
                                {!isPriorityEnabled(priority.priority) && (
                                  <div className="text-xs text-gray-400 italic">
                                    غیرفعال
                                  </div>
                                )}
                              </div>
                            ) : (
                              // کاربران با دسترسی محدود - اولویت‌های موجود فقط نمایش، خالی‌ها قابل اضافه
                              <div className="flex items-center gap-2">
                                {priority.destination &&
                                priority.destination !== "انتخاب نشده" ? (
                                  // اولویت موجود - فقط نمایش متنی
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                      {priority.destination}
                                    </span>
                                    <div className="text-xs text-blue-600 italic">
                                      ثبت شده
                                    </div>
                                  </div>
                                ) : (
                                  // اولویت خالی - قابل اضافه کردن
                                  <select
                                    value={priority.destinationCode || ""}
                                    onChange={(e) =>
                                      handleDestinationChange(
                                        priority.priority,
                                        e.target.value
                                      )
                                    }
                                    disabled={
                                      !isPriorityEnabled(priority.priority)
                                    }
                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                      !isPriorityEnabled(priority.priority)
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    <option value="">
                                      {!isPriorityEnabled(priority.priority)
                                        ? "ابتدا اولویت قبلی را انتخاب کنید"
                                        : "منطقه را انتخاب کنید"}
                                    </option>
                                    {isPriorityEnabled(priority.priority) &&
                                      getAvailableDistrictsForPriority(
                                        priority.priority
                                      ).map((district) => (
                                        <option
                                          key={district._id}
                                          value={district.code}
                                        >
                                          {district.name} ({district.code}) -{" "}
                                          {district.province.name}
                                        </option>
                                      ))}
                                  </select>
                                )}
                                {!isPriorityEnabled(priority.priority) && (
                                  <div className="text-xs text-gray-400 italic">
                                    غیرفعال
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center border-b">
                            <div
                              className={`flex justify-center items-center gap-8 ${
                                !isPriorityEnabled(priority.priority)
                                  ? "opacity-50"
                                  : ""
                              }`}
                            >
                              <label
                                className={`flex items-center ${
                                  !isPriorityEnabled(priority.priority)
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`transferType_${priority.priority}`}
                                  value="دائم یا موقت با اولویت دائم"
                                  checked={
                                    transferTypes[priority.priority] ===
                                    "دائم یا موقت با اولویت دائم"
                                  }
                                  onChange={(e) =>
                                    handleTransferTypeChange(
                                      priority.priority,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isPriorityEnabled(priority.priority)
                                  }
                                  className="ml-2 text-blue-600 focus:ring-blue-500 disabled:text-gray-400"
                                />
                                <span
                                  className={`text-sm ${
                                    !isPriorityEnabled(priority.priority)
                                      ? "text-gray-400"
                                      : "text-gray-700"
                                  }`}
                                >
                                  دائم یا موقت با اولویت دائم
                                </span>
                              </label>

                              <label
                                className={`flex items-center ${
                                  !isPriorityEnabled(priority.priority)
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`transferType_${priority.priority}`}
                                  value="فقط دائم"
                                  checked={
                                    transferTypes[priority.priority] ===
                                    "فقط دائم"
                                  }
                                  onChange={(e) =>
                                    handleTransferTypeChange(
                                      priority.priority,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isPriorityEnabled(priority.priority)
                                  }
                                  className="ml-2 text-blue-600 focus:ring-blue-500 disabled:text-gray-400"
                                />
                                <span
                                  className={`text-sm ${
                                    !isPriorityEnabled(priority.priority)
                                      ? "text-gray-400"
                                      : "text-gray-700"
                                  }`}
                                >
                                  فقط دائم
                                </span>
                              </label>

                              <label
                                className={`flex items-center ${
                                  !isPriorityEnabled(priority.priority)
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`transferType_${priority.priority}`}
                                  value="فقط موقت"
                                  checked={
                                    transferTypes[priority.priority] ===
                                    "فقط موقت"
                                  }
                                  onChange={(e) =>
                                    handleTransferTypeChange(
                                      priority.priority,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    !isPriorityEnabled(priority.priority)
                                  }
                                  className="ml-2 text-blue-600 focus:ring-blue-500 disabled:text-gray-400"
                                />
                                <span
                                  className={`text-sm ${
                                    !isPriorityEnabled(priority.priority)
                                      ? "text-gray-400"
                                      : "text-gray-700"
                                  }`}
                                >
                                  فقط موقت
                                </span>
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">اولویت‌های مقصد یافت نشد</p>
                </div>
              )}

              {/* اطلاعیه برای کاربران */}
              {/* <div
                className={`border rounded-lg p-6 mb-8 ${
                  canEditDestination
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <div
                  className={`flex items-center gap-2 mb-2 ${
                    canEditDestination ? "text-green-800" : "text-orange-800"
                  }`}
                >
                  {canEditDestination ? (
                    <FaCheck className="h-5 w-5" />
                  ) : (
                    <FaExclamationTriangle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {canEditDestination ? "دسترسی شما:" : "توجه:"}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    canEditDestination ? "text-green-700" : "text-orange-700"
                  }`}
                >
                  {canEditDestination
                    ? "شما می‌توانید هم مقصدها و هم نوع انتقال مورد تقاضا را تغییر دهید."
                    : "شما می‌توانید اولویت‌های خالی را تکمیل کرده و نوع انتقال مورد تقاضا را تغییر دهید. اولویت‌های ثبت شده قبلی قابل ویرایش نیستند."}
                </p>
              </div> */}

              {/* دکمه‌های ناوبری */}
              {/* دکمه ذخیره تغییرات */}
              {hasChangesStep4 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <FaExclamationTriangle className="h-5 w-5" />
                      <span className="font-medium">تغییرات ذخیره نشده</span>
                    </div>
                    <button
                      onClick={saveStep4Changes}
                      disabled={savingStep4}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingStep4 ? (
                        <>
                          <FaSpinner className="h-4 w-4 animate-spin" />
                          در حال ذخیره...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="h-4 w-4" />
                          ذخیره تغییرات
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-yellow-700 text-sm mt-2">
                    شما تغییراتی در نوع انتقال یا مقصدها ایجاد کرده‌اید. لطفاً
                    قبل از ادامه، تغییرات را ذخیره کنید.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center mt-8">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaArrowRight className="h-4 w-4 " />
                  بازگشت به مرحله قبل
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  disabled={hasChangesStep4}
                  className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    hasChangesStep4
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                  title={
                    hasChangesStep4 ? "لطفاً ابتدا تغییرات را ذخیره کنید" : ""
                  }
                >
                  ادامه به مرحله بعد
                  <FaArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaArrowRight className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    مرحله پنجم: پیش نمایش اطلاعات درخواست
                  </h2>
                  <p className="text-orange-100 text-sm">
                    بررسی نهایی اطلاعات قبل از تایید
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* متن راهنما */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
                <p className="text-gray-800 leading-relaxed">
                  لطفاً تمام اطلاعات وارد شده در مراحل قبل را بررسی کنید. در
                  صورت صحت اطلاعات، می‌توانید به مرحله تایید نهایی بروید.
                </p>
              </div>

              {/* خلاصه مرحله 2 - مشخصات کاربر */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-green-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                      <FaUser className="h-5 w-5" />
                      مرحله 2: مشخصات فردی
                    </h3>
                  </div>
                  <div className="p-6">
                    {userSpecs ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <tbody className="divide-y divide-gray-200 text-right">
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200 w-1/3 text-right text-nowrap">
                                <div className="flex items-center gap-2">
                                  <FaUser className="h-4 w-4 text-blue-500" />
                                  نام و نام خانوادگی
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium text-right">
                                {userSpecs.firstName} {userSpecs.lastName}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <FaFileAlt className="h-4 w-4 text-green-500" />
                                  کد ملی
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium font-mono">
                                {userSpecs.nationalId || (
                                  <span className="text-gray-400 italic">
                                    ثبت نشده
                                  </span>
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <FaFileAlt className="h-4 w-4 text-purple-500" />
                                  کد پرسنلی
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium font-mono">
                                {userSpecs.personnelCode}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <FaPhone className="h-4 w-4 text-orange-500" />
                                  تلفن همراه
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium font-mono">
                                {userSpecs.mobile}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <FaClipboardList className="h-4 w-4 text-indigo-500" />
                                  رشته استخدامی (رشته انتقال)
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                                {userSpecs.employmentField}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  <FaUserFriends className="h-4 w-4 text-pink-500" />
                                  جنسیت
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    userSpecs.gender === "male"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-pink-100 text-pink-800"
                                  }`}
                                >
                                  {userSpecs.gender === "male"
                                    ? "مرد"
                                    : userSpecs.gender === "female"
                                    ? "زن"
                                    : userSpecs.gender}
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200 text-right text-nowrap">
                                <div className="flex items-center gap-2">
                                  <FaClock className="h-4 w-4 text-yellow-500" />
                                  سنوات تجربی مؤثر تا 31 شهریور 1404
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 text-right text-nowrap">
                                  {userSpecs.effectiveYears} سال
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200 text-right text-nowrap">
                                <div className="flex items-center gap-2">
                                  <FaHome className="h-4 w-4 text-red-500" />
                                  منطقه اصلی محل خدمت (مبدأ انتقال)
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  {userSpecs.districtName || "نامشخص"}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          اطلاعات مشخصات یافت نشد
                        </p>
                      </div>
                    )}

                    {/* نمایش درخواست‌های اصلاح در صورت وجود */}
                    {correctionRequests.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-3">
                          درخواست‌های اصلاح مشخصات:
                        </h4>
                        <div className="space-y-2">
                          {correctionRequests.map((request) => (
                            <div
                              key={request._id}
                              className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-yellow-800">
                                  {getFieldDisplayName(request.disputedField)}:{" "}
                                  {request.description}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    request.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : request.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {request.status === "pending"
                                    ? "در انتظار بررسی"
                                    : request.status === "approved"
                                    ? "تایید شده"
                                    : "رد شده"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* خلاصه مرحله 3 - درخواست تجدیدنظر */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-purple-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
                      <FaFileAlt className="h-5 w-5" />
                      مرحله 3: درخواست تجدیدنظر
                    </h3>
                  </div>
                  <div className="p-6">
                    {selectedReasons.size > 0 ? (
                      <>
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-800 mb-3">
                            دلایل انتخاب شده ({selectedReasons.size} مورد):
                          </h4>
                          <div className="space-y-2">
                            {transferReasons
                              .filter((reason) =>
                                selectedReasons.has(reason._id)
                              )
                              .map((reason) => (
                                <div
                                  key={reason._id}
                                  className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                                      {reason.reasonCode}
                                    </span>
                                    <div>
                                      <p className="font-medium text-blue-900">
                                        {reason.reasonTitle}
                                      </p>
                                      {reason.title && (
                                        <p className="text-sm text-blue-700 mt-1">
                                          {reason.title}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* اطلاعات زوج فرهنگی */}
                        {culturalCoupleInfo.personnelCode && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-800 mb-3">
                              اطلاعات زوج فرهنگی:
                            </h4>
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    کد پرسنلی همسر:
                                  </span>
                                  <span className="font-medium">
                                    {culturalCoupleInfo.personnelCode}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    منطقه همسر:
                                  </span>
                                  <span className="font-medium">
                                    {/* {culturalCoupleInfo.districtCode} -{" "} */}
                                    {culturalCoupleInfo.districtName}
                                  </span>
                                </div>

                                {/* نظر منطقه خدمت همسر */}
                                {culturalCoupleInfo.spouseDistrictOpinion && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      نظر منطقه خدمت:
                                    </span>
                                    <span className="font-medium">
                                      {culturalCoupleInfo.spouseDistrictOpinion}
                                    </span>
                                  </div>
                                )}

                                {/* توضیح منطقه خدمت همسر */}
                                {culturalCoupleInfo.spouseDistrictDescription && (
                                  <div className="col-span-2">
                                    <div className="flex flex-col">
                                      <span className="text-gray-600 mb-1">
                                        توضیحات منطقه خدمت:
                                      </span>
                                      <span className="font-medium text-sm bg-gray-50 p-2 rounded">
                                        {
                                          culturalCoupleInfo.spouseDistrictDescription
                                        }
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* هشدارهای سنوات */}
                        {yearsWarnings.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-800 mb-3">
                              هشدارهای سنوات:
                            </h4>
                            <div className="space-y-2">
                              {yearsWarnings.map((warning, index) => (
                                <div
                                  key={index}
                                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                                >
                                  <p className="text-yellow-800 text-sm">
                                    {typeof warning === "string"
                                      ? warning
                                      : warning.message}
                                  </p>
                                  {typeof warning === "object" &&
                                    warning.userYears !== undefined && (
                                      <div className="mt-2 text-xs text-yellow-600">
                                        سنوات کاربر: {warning.userYears} سال |
                                        سنوات مورد نیاز: {warning.requiredYears}{" "}
                                        سال
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* هشدارهای کمیسیون پزشکی */}
                        {medicalCommissionWarnings.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-800 mb-3">
                              رای کمیسیون پزشکی:
                            </h4>
                            <div className="space-y-2">
                              {medicalCommissionWarnings.map(
                                (warning, index) => (
                                  <div
                                    key={index}
                                    className={`rounded-lg p-3 ${
                                      warning.type === "required_missing"
                                        ? "bg-red-50 border border-red-200"
                                        : "bg-orange-50 border border-orange-200"
                                    }`}
                                  >
                                    <p
                                      className={`text-sm ${
                                        warning.type === "required_missing"
                                          ? "text-red-800"
                                          : "text-orange-800"
                                      }`}
                                    >
                                      {warning.message}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">هیچ دلیلی انتخاب نشده است</p>
                    )}
                  </div>
                </div>
              </div>

              {/* خلاصه مرحله 4 - کنترل نوع انتقال */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-indigo-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-indigo-800 flex items-center gap-2">
                      <FaShieldAlt className="h-5 w-5" />
                      مرحله 4: کنترل نوع انتقال
                    </h3>
                  </div>
                  <div className="p-6">
                    {destinationPriorities.length > 0 ? (
                      <>
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-800 mb-3">
                            اولویت‌های مقصد و نوع انتقال:
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">
                                    اولویت
                                  </th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">
                                    مقصد
                                  </th>
                                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                                    نوع انتقال
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {destinationPriorities.map(
                                  (priority, index) => (
                                    <tr
                                      key={priority.priority}
                                      className={
                                        index % 2 === 0
                                          ? "bg-white"
                                          : "bg-gray-50"
                                      }
                                    >
                                      <td className="px-4 py-3 text-right text-sm text-gray-900 border-b">
                                        {priority.priority}
                                      </td>
                                      <td className="px-4 py-3 text-right text-sm text-gray-900 border-b">
                                        {priority.destination}
                                      </td>
                                      <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                          {transferTypes[priority.priority] ||
                                            priority.transferType}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {canEditDestination && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800 text-sm">
                              <strong>توجه:</strong> شما امکان ویرایش مقصدهای
                              انتخابی را دارید.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">
                        اطلاعات اولویت‌های مقصد یافت نشد
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* دکمه‌های عملیات */}
              <div className="flex gap-3 justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaArrowRight className="h-4 w-4" />
                  بازگشت به مرحله قبل
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handleResetProcess}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaUndo className="h-4 w-4" />
                    شروع مجدد
                  </button>
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    تایید و ادامه
                    <FaArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-lg">
                  <FaCheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">مرحله ششم: تایید نهایی</h2>
                  <p className="text-green-100 text-sm">
                    تایید و ارسال نهایی درخواست تجدیدنظر در نتیجه انتقال
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* متن راهنما */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <div className="flex items-start gap-4">
                  <FaInfoCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">
                      تایید نهایی درخواست
                    </h4>
                    <p className="text-green-700 leading-relaxed mb-4">
                      با کلیک بر روی دکمه &quot;تایید و ارسال نهایی&quot;،
                      درخواست تجدیدنظر در نتیجه انتقال شما به صورت رسمی ثبت و
                      برای بررسی ارسال خواهد شد.
                    </p>
                    <div className="bg-green-100 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">
                        نکات مهم:
                      </h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>
                          • پس از تایید نهایی، امکان ویرایش درخواست وجود نخواهد
                          داشت
                        </li>
                        <li>• درخواست شما وارد فرآیند بررسی رسمی خواهد شد</li>
                        <li>
                          • وضعیت درخواست و گردش فرایند از طریق همین صفحه قابل
                          پیگیری است
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* خلاصه کلی درخواست */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                      <FaClipboardList className="h-5 w-5" />
                      خلاصه درخواست تجدیدنظر در نتیجه انتقال
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <FaUser className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium text-gray-800">متقاضی</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          نام: {userSpecs?.firstName} {userSpecs?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          کد پرسنلی: {userSpecs?.personnelCode}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <FaFileAlt className="h-5 w-5 text-purple-600" />
                          <h4 className="font-medium text-gray-800">
                            دلایل انتقال
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          {selectedReasons.size} دلیل انتخاب شده
                        </p>
                        {culturalCoupleInfo.personnelCode && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ زوج فرهنگی
                          </p>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <FaShieldAlt className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-medium text-gray-800">مقاصد</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          {
                            destinationPriorities.filter(
                              (p) =>
                                p.destination &&
                                p.destination !== "انتخاب نشده" &&
                                p.destinationCode
                            ).length
                          }{" "}
                          مقصد انتخاب شده از {destinationPriorities.length}{" "}
                          اولویت
                        </p>
                        {canEditDestination && (
                          <p className="text-sm text-blue-600 mt-1">
                            ✓ قابل ویرایش
                          </p>
                        )}
                      </div>
                    </div>

                    {correctionRequests.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-medium text-yellow-800">
                              درخواست‌های اصلاح
                            </h4>
                          </div>
                          <p className="text-sm text-yellow-700">
                            {correctionRequests.length} درخواست اصلاح مشخصات در
                            انتظار بررسی
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* توضیحات کاربر */}
              {userComments && (
                <div className="mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                    <div className="bg-blue-100 px-6 py-4 border-b border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                        <FaEdit className="h-5 w-5" />
                        توضیحات تکمیلی کاربر
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {userComments}
                        </p>

                        {/* نمایش تصاویر پیوست */}
                        {userCommentsImages.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <FaImage className="h-4 w-4" />
                              تصاویر پیوست ({userCommentsImages.length})
                            </h6>
                            <div className="grid grid-cols-2 gap-3">
                              {userCommentsImages.map((image, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <FaImage className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs text-gray-700 truncate flex-1">
                                      {image.originalName}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-2">
                                    {new Date(
                                      image.uploadedAt
                                    ).toLocaleDateString("fa-IR")}
                                  </div>
                                  <a
                                    href={`/api/transfer-applicant/download-document/${image.fileName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  >
                                    <FaDownload className="h-3 w-3" />
                                    مشاهده تصویر
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* چک‌باکس تایید */}
              <div className="mb-8">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={finalConfirmation}
                      onChange={(e) => setFinalConfirmation(e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-800 mb-2">
                        تایید صحت اطلاعات و ارسال درخواست
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        اینجانب تایید می‌کنم که تمام اطلاعات وارد شده صحیح بوده
                        و مسئولیت صحت آن‌ها بر عهده من است. همچنین از قوانین و
                        مقررات مربوط به درخواست تجدیدنظر در نتیجه انتقال آگاه
                        بوده و آن‌ها را می‌پذیرم.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* دکمه‌های عملیات */}
              <div className="flex gap-3 justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaArrowRight className="h-4 w-4" />
                  بازگشت به مرحله قبل
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handleResetProcess}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaUndo className="h-4 w-4" />
                    شروع مجدد
                  </button>
                  <button
                    onClick={handleFinalSubmission}
                    disabled={!finalConfirmation || submittingFinalRequest}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                  >
                    {submittingFinalRequest ? (
                      <>
                        <FaSpinner className="animate-spin h-4 w-4" />
                        در حال ارسال...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="h-4 w-4" />
                        تایید و ارسال نهایی
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal اعتراض به اطلاعات */}
        {showCorrectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <FaTimes className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        درخواست اصلاح مشخصات
                      </h3>
                      <p className="text-orange-100 text-sm">
                        درخواست اصلاح مشخصات ارسال کنید
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCorrectionModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* فیلد نیاز به اصلاح */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    فیلد نیاز به اصلاح <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={correctionForm.disputedField}
                    onChange={(e) =>
                      setCorrectionForm((prev) => ({
                        ...prev,
                        disputedField: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">انتخاب کنید</option>
                    {getCustomFieldsForCorrection().map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* توضیحات */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات درخواست <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={correctionForm.description}
                    onChange={(e) =>
                      setCorrectionForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="لطفاً توضیح دهید که چه مشکلی در اطلاعات وجود دارد و چه تغییری مد نظر شماست..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {correctionForm.description.length}/1000 کاراکتر
                  </div>
                </div>

                {/* آپلود تصویر */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تصویر پیوست (اختیاری)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                    {correctionForm.attachmentImage ? (
                      <div className="space-y-3">
                        <img
                          src={`/api/auth/getimg/${correctionForm.attachmentImage}`}
                          alt="تصویر پیوست"
                          className="w-32 h-32 object-cover rounded-lg mx-auto"
                          onError={(e) => {
                            console.error("Error loading image:", e);
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() =>
                              setCorrectionForm((prev) => ({
                                ...prev,
                                attachmentImage: null,
                              }))
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            حذف تصویر
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="bg-orange-100 p-3 rounded-full">
                            <FaArrowRight className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {uploadingImage
                                ? "در حال آپلود..."
                                : "کلیک کنید تا تصویر انتخاب کنید"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              حداکثر 2 مگابایت - فرمت‌های JPG، PNG
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCorrectionModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleSubmitCorrection}
                    disabled={
                      !correctionForm.disputedField ||
                      !correctionForm.description ||
                      submittingCorrection
                    }
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submittingCorrection ? (
                      <FaSpinner className="animate-spin h-4 w-4" />
                    ) : (
                      <FaCheck className="h-4 w-4" />
                    )}
                    {submittingCorrection ? "در حال ارسال..." : "ارسال درخواست"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
