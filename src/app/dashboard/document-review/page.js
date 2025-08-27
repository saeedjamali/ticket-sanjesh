"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaSearch,
  FaFilter,
  FaClock,
  FaUser,
  FaPhone,
  FaIdCard,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaDownload,
  FaInfoCircle,
  FaThumbsUp,
  FaThumbsDown,
  FaFileExcel,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import ChatButton from "@/components/chat/ChatButton";
import { getFieldDisplayName } from "@/lib/fieldTranslations";

export default function DocumentReviewPage() {
  const { user, userLoading } = useUser();
  const [appealRequests, setAppealRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // State برای مدال‌های نظر مبدا
  const [showSourceOpinionModal, setShowSourceOpinionModal] = useState(false);
  const [sourceOpinionType, setSourceOpinionType] = useState(null); // 'approve' یا 'reject'
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [approvalReasons, setApprovalReasons] = useState({
    approval: [],
    rejection: [],
  });
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [sourceComment, setSourceComment] = useState("");
  const [loadingReasons, setLoadingReasons] = useState(false);

  // State برای لودینگ جداگانه دکمه‌های مشمولیت
  const [approvingEligibility, setApprovingEligibility] = useState(false);
  const [rejectingEligibility, setRejectingEligibility] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // State برای تشخیص ذخیره شدن تغییرات
  const [isDataSaved, setIsDataSaved] = useState(false);

  // Reset ذخیره شدن تغییرات هنگام تغییر reviewData
  useEffect(() => {
    setIsDataSaved(false);
  }, [reviewData]);

  // State برای pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State برای نمایش/مخفی کردن آمار
  const [showStats, setShowStats] = useState(true);

  // محاسبه تعداد درخواست‌ها بر اساس وضعیت
  const getStatusCounts = () => {
    const counts = {
      all: appealRequests.length,
      awaiting_user_approval: 0,
      user_approval: 0,
      source_review: 0,
      exception_eligibility_approval: 0,
      exception_eligibility_rejection: 0,
      source_approval: 0,
      source_rejection: 0,
      province_approval: 0,
      province_rejection: 0,
    };

    appealRequests.forEach((request) => {
      const status = request.currentRequestStatus || "pending";
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  // تعریف وضعیت‌ها با عنوان فارسی و رنگ
  const statusOptions = [
    {
      value: "all",
      label: "همه درخواست‌ها",
      color: "bg-blue-500",
      icon: FaFileAlt,
    },
    {
      value: "awaiting_user_approval",
      label: "در انتظار تایید کاربر",
      color: "bg-blue-500",
      icon: FaEye,
    },
    {
      value: "user_approval",
      label: "تایید کاربر",
      color: "bg-yellow-500",
      icon: FaClock,
    },

    {
      value: "source_review",
      label: "بررسی مبدا",
      color: "bg-purple-500",
      icon: FaUser,
    },
    {
      value: "exception_eligibility_approval",
      label: "تایید مشمولیت",
      color: "bg-green-500",
      icon: FaCheck,
    },
    {
      value: "exception_eligibility_rejection",
      label: "رد مشمولیت",
      color: "bg-red-500",
      icon: FaTimes,
    },
    {
      value: "source_approval",
      label: "تایید مبدا",
      color: "bg-green-600",
      icon: FaThumbsUp,
    },
    {
      value: "source_rejection",
      label: "رد مبدا",
      color: "bg-red-600",
      icon: FaThumbsDown,
    },
    {
      value: "province_approval",
      label: "تایید استان",
      color: "bg-emerald-500",
      icon: FaThumbsUp,
    },
    {
      value: "province_rejection",
      label: "رد استان",
      color: "bg-rose-500",
      icon: FaThumbsDown,
    },
  ];

  // دریافت لیست درخواست‌های تجدید نظر
  const fetchAppealRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/document-review", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setAppealRequests(data.requests);
      } else {
        toast.error(data.error || "خطا در دریافت درخواست‌ها");
      }
    } catch (error) {
      console.error("Error fetching appeal requests:", error);
      toast.error("خطا در دریافت درخواست‌ها");
    } finally {
      setLoading(false);
    }
  };

  // دریافت دلایل موافقت و مخالفت
  const fetchApprovalReasons = async () => {
    try {
      setLoadingReasons(true);
      const response = await fetch("/api/approval-reasons", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        setApprovalReasons(data.data);
      } else {
        toast.error(data.error || "خطا در دریافت دلایل");
      }
    } catch (error) {
      console.error("Error fetching approval reasons:", error);
      toast.error("خطا در دریافت دلایل");
    } finally {
      setLoadingReasons(false);
    }
  };

  // تابع دریافت گزارش اکسل کامل
  const handleExportToExcel = async () => {
    try {
      setExportingExcel(true);

      // دریافت اطلاعات کامل از TransferApplicantSpec برای هر درخواست
      const enrichedData = await Promise.all(
        filteredRequests.map(async (request) => {
          try {
            const response = await fetch(
              `/api/transfer-applicant-specs?nationalId=${request.nationalId}`,
              {
                headers: { "Content-Type": "application/json" },
              }
            );
            const data = await response.json();
            console.log(
              `API Response for nationalId ${request.nationalId}:`,
              data
            );

            let transferSpec = null;
            if (data.success && data.specs && Array.isArray(data.specs)) {
              // Debug: چاپ تمام nationalId های موجود
              console.log(
                "Available nationalIds in API:",
                data.specs.map((spec) => spec.nationalId)
              );
              console.log("Looking for nationalId:", request.nationalId);
              console.log("nationalId type:", typeof request.nationalId);

              transferSpec = data.specs.find(
                (spec) => String(spec.nationalId) === String(request.nationalId)
              );
              console.log(
                `Found in data.specs for ${request.nationalId}:`,
                transferSpec
              );
            } else if (data.success && data.data && Array.isArray(data.data)) {
              transferSpec = data.data.find(
                (spec) => String(spec.nationalId) === String(request.nationalId)
              );
              console.log(
                `Found in data.data for ${request.nationalId}:`,
                transferSpec
              );
            } else if (data.success && data.spec) {
              // در صورتی که تک رکورد برگردانده شود
              transferSpec = data.spec;
              console.log(
                `Found in data.spec for ${request.nationalId}:`,
                transferSpec
              );
            } else {
              console.log(
                `No transferSpec found for ${request.nationalId}. API response structure:`,
                Object.keys(data)
              );
            }
            return { ...request, transferSpec };
          } catch (error) {
            console.error(
              `Error fetching transfer spec for nationalId ${request.nationalId}:`,
              error
            );
            return { ...request, transferSpec: null };
          }
        })
      );

      // دریافت لیست کامل دلایل انتقال برای مقایسه
      const transferReasonsResponse = await fetch(
        "/api/transfer-settings/transfer-reasons"
      );
      const transferReasonsData = await transferReasonsResponse.json();
      const allTransferReasons = transferReasonsData.success
        ? transferReasonsData.reasons
        : [];

      // تابع ترجمه نوع انتقال
      const getTransferTypeText = (type) => {
        const typeMap = {
          permanent_preferred: "دائم (ترجیحی)",
          permanent_only: "فقط دائم",
          temporary_only: "فقط موقت",
        };
        return typeMap[type] || type || "-";
      };

      // تابع ترجمه وضعیت
      const getStatusText = (status) => {
        const statusMap = {
          user_no_action: "عدم اقدام کاربر",
          awaiting_user_approval: "در انتظار تایید کاربر",
          user_approval: "تایید کاربر",
          source_review: "در حال بررسی مبدا",
          exception_eligibility_approval: "تایید مشمولیت استثنا",
          exception_eligibility_rejection: "رد مشمولیت استثنا",
          source_approval: "تایید مبدا",
          source_rejection: "رد مبدا",
          province_review: "در حال بررسی استان",
          province_approval: "تایید استان",
          province_rejection: "رد استان",
          // destination_review: "در حال بررسی مقصد",
          destination_approval: "تایید مقصد",
          destination_rejection: "رد مقصد",
        };
        return statusMap[status] || status || "-";
      };

      // تابع ترجمه وضعیت بررسی دلیل
      const getReviewStatusText = (status) => {
        const statusMap = {
          pending: "در انتظار",
          approved: "تایید شده",
          rejected: "رد شده",
        };
        return statusMap[status] || status || "-";
      };

      // آماده‌سازی داده‌ها برای اکسل
      const excelData = enrichedData.map((request, index) => {
        const ts = request.transferSpec;

        // Debug: چاپ اطلاعات transferSpec برای اولین درخواست
        if (index === 0) {
          console.log("=== DEBUG INFO FOR EXCEL EXPORT ===");
          console.log("Request data:", {
            personnelCode: request.personnelCode,
            nationalId: request.nationalId,
            fullName: request.fullName,
            districtCode: request.districtCode,
            sourceDistrictCode: request.sourceDistrictCode,
          });
          console.log("Transfer Spec (ts):", ts);
          console.log("Transfer Spec type:", typeof ts);
          console.log("Transfer Spec keys:", ts ? Object.keys(ts) : "null");

          if (ts) {
            console.log("sourceDistrictCode:", ts.sourceDistrictCode);
            console.log("destinationPriority1 full:", ts.destinationPriority1);
            console.log(
              "destinationPriority1 type:",
              typeof ts.destinationPriority1
            );
            console.log("destinationPriority2 full:", ts.destinationPriority2);
            console.log("destinationPriority3 full:", ts.destinationPriority3);

            // تست مستقیم دسترسی
            if (ts.destinationPriority1) {
              console.log(
                "Priority1 - districtCode:",
                ts.destinationPriority1.districtCode
              );
              console.log(
                "Priority1 - transferType:",
                ts.destinationPriority1.transferType
              );
            }
          }
          console.log("=== END DEBUG INFO ===");
        }

        // ایجاد ستون‌های دلایل
        const reasonsColumns = {};
        allTransferReasons.forEach((reason) => {
          const selectedReason = request.selectedReasons?.find(
            (sr) =>
              sr.reasonId?._id === reason._id || sr.reasonId === reason._id
          );
          // استفاده از فقط عنوان دلیل برای ستون
          const columnName =
            reason.reasonTitle || reason.title || `دلیل ${reason.reasonCode}`;
          reasonsColumns[columnName] = selectedReason ? "دارد" : "ندارد";
        });

        return {
          ردیف: index + 1,
          نام: request.fullName?.split(" ")[0] || "-",
          "نام خانوادگی":
            request.fullName?.split(" ").slice(1).join(" ") || "-",
          "کد ملی": request.nationalId || "-",
          "کد پرسنلی": request.personnelCode || "-",
          "شماره تماس": request.phone || "-",
          "کد مبدا":
            ts?.sourceDistrictCode ||
            request.districtCode ||
            request.sourceDistrictCode ||
            "-",

          // اولویت‌های مقصد (1 تا 7)
          "کد مقصد اولویت 1": (() => {
            const priority = ts?.destinationPriority1;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 1": (() => {
            const priority = ts?.destinationPriority1;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 2": (() => {
            const priority = ts?.destinationPriority2;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 2": (() => {
            const priority = ts?.destinationPriority2;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 3": (() => {
            const priority = ts?.destinationPriority3;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 3": (() => {
            const priority = ts?.destinationPriority3;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 4": (() => {
            const priority = ts?.destinationPriority4;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 4": (() => {
            const priority = ts?.destinationPriority4;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 5": (() => {
            const priority = ts?.destinationPriority5;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 5": (() => {
            const priority = ts?.destinationPriority5;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 6": (() => {
            const priority = ts?.destinationPriority6;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 6": (() => {
            const priority = ts?.destinationPriority6;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          "کد مقصد اولویت 7": (() => {
            const priority = ts?.destinationPriority7;
            if (priority && typeof priority === "object") {
              return priority.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال اولویت 7": (() => {
            const priority = ts?.destinationPriority7;
            if (priority && typeof priority === "object") {
              return getTransferTypeText(priority.transferType);
            }
            return "-";
          })(),

          // اضافه کردن ستون‌های دلایل
          ...reasonsColumns,

          // اطلاعات زوج فرهنگی
          "زوج فرهنگی": request.culturalCoupleInfo?.personnelCode
            ? "بله"
            : "خیر",
          "کد پرسنلی همسر": request.culturalCoupleInfo?.personnelCode || "-",
          "منطقه همسر": request.culturalCoupleInfo?.districtName || "-",
          "تصمیم منطقه همسر":
            request.culturalCoupleInfo?.spouseDistrictDecision === "approve"
              ? "موافقت"
              : request.culturalCoupleInfo?.spouseDistrictDecision === "reject"
              ? "مخالفت"
              : "-",

          // وضعیت بررسی
          "وضعیت بررسی کلی":
            request.overallReviewStatus === "pending"
              ? "در انتظار"
              : request.overallReviewStatus === "in_review"
              ? "در حال بررسی"
              : request.overallReviewStatus === "completed"
              ? "تکمیل شده"
              : "-",

          "تصمیم نهایی مشمولیت":
            request.eligibilityDecision?.decision === "approved"
              ? "تایید"
              : request.eligibilityDecision?.decision === "rejected"
              ? "رد"
              : "-",

          // تاریخ آخرین بررسی
          "تاریخ آخرین بررسی": (() => {
            const dates = [];
            if (request.reviewedAt) dates.push(new Date(request.reviewedAt));
            if (request.eligibilityDecision?.decidedAt)
              dates.push(new Date(request.eligibilityDecision.decidedAt));

            request.selectedReasons?.forEach((reason) => {
              if (reason.review?.reviewedAt)
                dates.push(new Date(reason.review.reviewedAt));
            });

            if (dates.length > 0) {
              const latestDate = new Date(Math.max(...dates));
              return (
                latestDate.toLocaleDateString("fa-IR") +
                " - " +
                latestDate.toLocaleTimeString("fa-IR")
              );
            }
            return "-";
          })(),

          // وضعیت پرسنل
          "وضعیت پرسنل": getStatusText(request.currentRequestStatus),

          // تصمیم کلی منطقه
          "تصمیم منطقه": (() => {
            // بررسی تصمیم نهایی مشمولیت
            if (request.eligibilityDecision?.decision === "approved") {
              return "موافقت";
            } else if (request.eligibilityDecision?.decision === "rejected") {
              return "مخالفت";
            }

            // بررسی وضعیت کلی پرسنل
            if (request.currentRequestStatus === "source_approval") {
              return "موافقت";
            } else if (request.currentRequestStatus === "source_rejection") {
              return "مخالفت";
            } else if (
              request.currentRequestStatus === "exception_eligibility_approval"
            ) {
              return "موافقت";
            } else if (
              request.currentRequestStatus === "exception_eligibility_rejection"
            ) {
              return "مخالفت";
            }

            return "-";
          })(),

          // نظر منطقه (جمع‌آوری نظرات کارشناسان)
          "نظر منطقه": (() => {
            const comments = [];
            request.selectedReasons?.forEach((reason) => {
              if (reason.review?.expertComment) {
                comments.push(
                  `${reason.reasonTitle || reason.reasonCode}: ${
                    reason.review.expertComment
                  }`
                );
              }
            });
            if (request.eligibilityDecision?.comment) {
              comments.push(
                `تصمیم نهایی: ${request.eligibilityDecision.comment}`
              );
            }
            return comments.join(" | ") || "-";
          })(),

          // جزئیات بررسی هر دلیل
          "جزئیات بررسی دلایل": (() => {
            return (
              request.selectedReasons
                ?.map((reason) => {
                  const reviewStatus = getReviewStatusText(
                    reason.review?.status
                  );
                  const reviewDate = reason.review?.reviewedAt
                    ? new Date(reason.review.reviewedAt).toLocaleDateString(
                        "fa-IR"
                      )
                    : "-";
                  return `${
                    reason.reasonTitle || reason.reasonCode
                  }: ${reviewStatus} (${reviewDate})`;
                })
                .join(" | ") || "-"
            );
          })(),

          // اطلاعات اضافی
          "نظرات کاربر": request.userComments || "-",
          سنوات: ts?.effectiveYears ? `${ts.effectiveYears} سال` : "-",
          "نوع استخدام": ts?.employmentType || "-",
          "سال تحصیلی": request.academicYear || "-",
          "تاریخ درخواست": request.createdAt
            ? new Date(request.createdAt).toLocaleDateString("fa-IR") +
              " - " +
              new Date(request.createdAt).toLocaleTimeString("fa-IR")
            : "-",
        };
      });

      // ایجاد workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // تنظیم عرض ستون‌ها
      const columnWidths = [
        { wch: 8 }, // ردیف
        { wch: 15 }, // نام
        { wch: 20 }, // نام خانوادگی
        { wch: 15 }, // کد ملی
        { wch: 15 }, // کد پرسنلی
        { wch: 15 }, // شماره تماس
        { wch: 12 }, // کد مبدا

        // اولویت‌های مقصد (14 ستون)
        ...Array(7)
          .fill()
          .map(() => [{ wch: 15 }, { wch: 20 }])
          .flat(),

        // ستون‌های دلایل (متغیر بر اساس تعداد دلایل)
        ...allTransferReasons.map(() => ({ wch: 12 })),

        { wch: 15 }, // زوج فرهنگی
        { wch: 15 }, // کد پرسنلی همسر
        { wch: 20 }, // منطقه همسر
        { wch: 15 }, // تصمیم منطقه همسر
        { wch: 20 }, // وضعیت بررسی کلی
        { wch: 20 }, // تصمیم نهایی مشمولیت
        { wch: 25 }, // تاریخ آخرین بررسی
        { wch: 25 }, // وضعیت پرسنل
        { wch: 15 }, // تصمیم منطقه
        { wch: 60 }, // نظر منطقه
        { wch: 80 }, // جزئیات بررسی دلایل
        { wch: 40 }, // نظرات کاربر
        { wch: 12 }, // سنوات
        { wch: 15 }, // نوع استخدام
        { wch: 15 }, // سال تحصیلی
        { wch: 25 }, // تاریخ درخواست
      ];
      ws["!cols"] = columnWidths;

      // اضافه کردن worksheet به workbook
      XLSX.utils.book_append_sheet(wb, ws, "گزارش کامل بررسی مستندات");

      // تولید نام فایل با تاریخ
      const currentDate = new Date()
        .toLocaleDateString("fa-IR")
        .replace(/\//g, "-");
      const fileName = `گزارش-کامل-بررسی-مستندات-${currentDate}.xlsx`;

      // دانلود فایل
      XLSX.writeFile(wb, fileName);

      toast.success(`فایل اکسل با موفقیت دانلود شد: ${fileName}`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("خطا در تولید فایل اکسل");
    } finally {
      setExportingExcel(false);
    }
  };

  // فیلتر کردن درخواست‌ها
  const filteredRequests = appealRequests.filter((request) => {
    const matchesSearch =
      request.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.nationalId?.includes(searchTerm) ||
      request.personnelCode?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || request.currentRequestStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // محاسبات pagination
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // تابع‌های pagination
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));

  // تغییر تعداد آیتم‌ها در هر صفحه
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // تابع دریافت رنگ وضعیت
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // تابع دریافت آیکون وضعیت
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FaClock className="h-4 w-4" />;
      case "in_review":
        return <FaEye className="h-4 w-4" />;
      case "completed":
        return <FaCheck className="h-4 w-4" />;
      default:
        return <FaClock className="h-4 w-4" />;
    }
  };

  // تابع دریافت متن وضعیت
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "در انتظار بررسی";
      case "in_review":
        return "در حال بررسی";
      case "completed":
        return "تکمیل شده";
      default:
        return "نامشخص";
    }
  };

  // توابع مربوط به وضعیت پرسنل
  const getPersonnelStatusColor = (status) => {
    switch (status) {
      case "user_no_action":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "awaiting_user_approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "user_approval":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "source_review":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "exception_eligibility_approval":
        return "bg-green-100 text-green-800 border-green-200";
      case "exception_eligibility_rejection":
        return "bg-red-100 text-red-800 border-red-200";
      case "source_approval":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "source_rejection":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "province_review":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "province_approval":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "province_rejection":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "destination_review":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "destination_approval":
        return "bg-lime-100 text-lime-800 border-lime-200";
      case "destination_rejection":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPersonnelStatusIcon = (status) => {
    switch (status) {
      case "user_no_action":
        return <FaExclamationTriangle className="h-3 w-3" />;
      case "awaiting_user_approval":
        return <FaClock className="h-3 w-3" />;
      case "user_approval":
        return <FaCheck className="h-3 w-3" />;
      case "source_review":
        return <FaEye className="h-3 w-3" />;
      case "exception_eligibility_approval":
        return <FaCheck className="h-3 w-3" />;
      case "exception_eligibility_rejection":
        return <FaTimes className="h-3 w-3" />;
      case "source_approval":
        return <FaCheck className="h-3 w-3" />;
      case "source_rejection":
        return <FaTimes className="h-3 w-3" />;
      case "province_review":
        return <FaEye className="h-3 w-3" />;
      case "province_approval":
        return <FaCheck className="h-3 w-3" />;
      case "province_rejection":
        return <FaTimes className="h-3 w-3" />;
      case "destination_review":
        return <FaEye className="h-3 w-3" />;
      case "destination_approval":
        return <FaCheck className="h-3 w-3" />;
      case "destination_rejection":
        return <FaTimes className="h-3 w-3" />;
      default:
        return <FaExclamationTriangle className="h-3 w-3" />;
    }
  };

  const getPersonnelStatusText = (status) => {
    switch (status) {
      case "user_no_action":
        return "عدم اقدام کاربر";
      case "awaiting_user_approval":
        return "در انتظار تایید کاربر";
      case "user_approval":
        return "تایید کاربر";
      case "source_review":
        return "در حال بررسی مبدا";
      case "exception_eligibility_approval":
        return "تایید مشمولیت استثنا";
      case "exception_eligibility_rejection":
        return "رد مشمولیت استثنا";
      case "source_approval":
        return "تایید مبدا";
      case "source_rejection":
        return "رد مبدا";
      case "province_review":
        return "در حال بررسی استان";
      case "province_approval":
        return "تایید استان";
      case "province_rejection":
        return "رد استان";
      case "destination_review":
        return "در حال بررسی مقصد";
      case "destination_approval":
        return "تایید مقصد";
      case "destination_rejection":
        return "رد مقصد";
      default:
        return "نامشخص";
    }
  };

  // باز کردن مودال بررسی
  const openReviewModal = (request) => {
    setSelectedRequest(request);
    console.log("request-------->", request);
    setShowReviewModal(true);
    // مقداردهی اولیه reviewData از ساختار جدید
    const initialReviewData = {};
    if (request.selectedReasons) {
      request.selectedReasons.forEach((reason) => {
        const reasonKey = reason._id;
        // استفاده از اطلاعات بررسی موجود در reason.review
        initialReviewData[reasonKey] = reason.review?.status || "pending";
        if (reason.review?.expertComment) {
          initialReviewData[`${reasonKey}_comment`] =
            reason.review.expertComment;
        }
      });
    }
    setReviewData(initialReviewData);
    setIsDataSaved(false); // Reset ذخیره شدن تغییرات
  };

  // محاسبه وضعیت دکمه‌های تایید/رد مشمولیت
  const getEligibilityButtonsState = (request) => {
    if (!request?.selectedReasons?.length) {
      return {
        showButtons: false,
        canApprove: false,
        canReject: false,
        message: "هیچ بندی انتخاب نشده است",
      };
    }
    // تقسیم دلایل بر اساس نیاز به تایید کارشناس
    const reasonsRequiringApproval = request.selectedReasons.filter(
      (reason) => reason?.reasonId?.requiresAdminApproval === true
    );

    const reasonsNotRequiringApproval = request.selectedReasons.filter(
      (reason) => reason?.reasonId?.requiresAdminApproval === false
    );

    // اگر هیچ دلیلی نیاز به تایید کارشناس ندارد
    if (reasonsRequiringApproval.length === 0) {
      return {
        showButtons: true,
        canApprove: true,
        canReject: true,
        message: "تمام بندها نیاز به بررسی کارشناس ندارند",
      };
    }

    // بررسی وضعیت دلایلی که نیاز به تایید کارشناس دارند
    const pendingReasons = reasonsRequiringApproval.filter(
      (reason) => reason?.review?.status === "pending"
    );

    const approvedReasons = reasonsRequiringApproval.filter(
      (reason) => reason?.review?.status === "approved"
    );

    const rejectedReasons = reasonsRequiringApproval.filter(
      (reason) => reason?.review?.status === "rejected"
    );

    // اگر بندی هنوز بررسی نشده (pending)
    if (pendingReasons.length > 0) {
      // اگر بندی بدون نیاز به تایید کارشناس وجود دارد، دکمه‌ها فعال باشند
      if (reasonsNotRequiringApproval.length > 0) {
        return {
          showButtons: true,
          canApprove: false,
          canReject: false,
          message: `${pendingReasons.length} بند هنوز بررسی نشده،  ${reasonsNotRequiringApproval.length} بند نیاز به بررسی کارشناس ندارد`,
          hasPendingButAllowDecision: true,
        };
      }
      // اگر همه بندها نیاز به تایید کارشناس دارند و بعضی pending هستند
      return {
        showButtons: false,
        canApprove: false,
        canReject: false,
        message: `${pendingReasons.length} بند هنوز بررسی نشده و منتظر تایید/رد کارشناس است`,
      };
    }

    // اگر همه بندهای نیازمند تایید رد شده‌اند
    if (rejectedReasons.length === reasonsRequiringApproval.length) {
      // اگر بندی بدون نیاز به تایید کارشناس وجود دارد، دکمه‌ها فعال باشند
      if (reasonsNotRequiringApproval.length > 0) {
        return {
          showButtons: true,
          canApprove: true,
          canReject: true,
          message: `تمام بندهای نیازمند بررسی کارشناس، رد شده‌اند،  ${reasonsNotRequiringApproval.length} بند نیاز به بررسی کارشناس ندارد`,
          allRequiredRejectedButHasNonRequired: true,
        };
      }
      // اگر همه بندها نیاز به تایید کارشناس دارند و همه رد شده‌اند
      return {
        showButtons: true,
        canApprove: false,
        canReject: true,
        message: "تمام بندهای نیازمند نظر کارشناس رد شده‌اند",
        allRejected: true,
      };
    }

    // اگر همه بندهای نیازمند تایید تایید شده‌اند
    if (approvedReasons.length === reasonsRequiringApproval.length) {
      // اگر بندی بدون نیاز به تایید کارشناس وجود دارد، دکمه‌ها فعال باشند
      if (reasonsNotRequiringApproval.length > 0) {
        return {
          showButtons: true,
          canApprove: true,
          canReject: true,
          message: `تمام بندهای نیازمند بررسی تایید شده‌اند، اما ${reasonsNotRequiringApproval.length} بند نیاز به بررسی کارشناس ندارد`,
          allRequiredApprovedButHasNonRequired: true,
        };
      }
      // اگر همه بندها نیاز به تایید کارشناس دارند و همه تایید شده‌اند
      return {
        showButtons: true,
        canApprove: true,
        canReject: false,
        message: "تمام بندهای نیازمند بررسی کارشناس تایید شده‌اند",
        allApproved: true,
      };
    }

    // اگر ترکیبی از تایید و رد وجود دارد
    return {
      showButtons: true,
      canApprove: true,
      canReject: true,
      message: `${approvedReasons.length} بند تایید و ${
        rejectedReasons.length
      } بند رد شده است${
        reasonsNotRequiringApproval.length > 0
          ? ` و ${reasonsNotRequiringApproval.length} بند نیاز به بررسی کارشناس منطقه ندارد`
          : ""
      }`,
    };
  };

  // محاسبه وضعیت نهایی دکمه‌های تایید/رد مشمولیت (با در نظر گیری ذخیره شدن تغییرات)
  const getFinalEligibilityButtonsState = (request) => {
    console.log("getFinalEligibilityButtonsState - isDataSaved:", isDataSaved);
    console.log("getFinalEligibilityButtonsState - request:", request);

    // اگر تغییرات ذخیره نشده‌اند، دکمه‌ها غیرفعال باشند
    if (!isDataSaved) {
      return {
        showButtons: true,
        canApprove: false,
        canReject: false,
        message: "ابتدا باید تغییرات را ذخیره کنید",
        allApproved: false,
        allRejected: false,
        allRequiredApprovedButHasNonRequired: false,
        allRequiredRejectedButHasNonRequired: false,
      };
    }

    // اگر تغییرات ذخیره شده، محاسبه مجدد وضعیت با داده‌های به‌روز
    const finalState = getEligibilityButtonsState(request);
    console.log("getFinalEligibilityButtonsState - finalState:", finalState);
    return finalState;
  };

  // تایید/رد مشمولیت
  const handleEligibilityDecision = async (action, comment = "") => {
    if (!selectedRequest) return;
    // const confirmed = window.confirm("آیا از ذخیره تغییرات اطمینان دارید؟");
    // if (!confirmed) return;
    // بررسی وضعیت دکمه‌ها قبل از ارسال درخواست
    const buttonState = getFinalEligibilityButtonsState(selectedRequest);

    // اگر تمام بندهای نیازمند تایید رد شده و می‌خواهد تایید کند (بدون بند غیرنیازمند)
    if (action === "approve" && buttonState.allRejected) {
      toast.error(
        "امکان تایید مشمولیت وجود ندارد زیرا تمام بندهای نیازمند تایید رد شده‌اند"
      );
      return;
    }

    // اگر تمام بندهای نیازمند تایید تایید شده و می‌خواهد رد کند (بدون بند غیرنیازمند)
    if (action === "reject" && buttonState.allApproved) {
      toast.error(
        "امکان رد مشمولیت وجود ندارد زیرا تمام بندهای نیازمند تایید تایید شده‌اند"
      );
      return;
    }

    // هشدارهای اضافی برای حالات خاص
    if (
      action === "approve" &&
      buttonState.allRequiredRejectedButHasNonRequired
    ) {
      toast(
        "توجه: تمام بندهای نیازمند بررسی کارشناس رد شده‌اند، اما تایید مشمولیت بر اساس بندهای غیرنیازمند انجام می‌شود",
        {
          icon: "⚠️",
          style: {
            borderLeft: "4px solid #f59e0b",
            backgroundColor: "#fef3c7",
            color: "#92400e",
          },
        }
      );
    }

    if (
      action === "reject" &&
      buttonState.allRequiredApprovedButHasNonRequired
    ) {
      toast(
        "توجه: تمام بندهای نیازمند بررسی کارشناس تایید شده‌اند، اما رد مشمولیت بر اساس بندهای غیرنیازمند انجام می‌شود",
        {
          icon: "⚠️",
          style: {
            borderLeft: "4px solid #f59e0b",
            backgroundColor: "#fef3c7",
            color: "#92400e",
          },
        }
      );
    }

    if (buttonState.hasPendingButAllowDecision) {
      toast(
        "توجه: برخی بندها هنوز بررسی نشده‌اند، اما تصمیم‌گیری بر اساس بندهای غیرنیازمند انجام می‌شود",
        {
          icon: "ℹ️",
          style: {
            borderLeft: "4px solid #3b82f6",
            backgroundColor: "#dbeafe",
            color: "#1e40af",
          },
        }
      );
    }

    try {
      // تنظیم لودینگ مخصوص هر دکمه
      if (action === "approve") {
        setApprovingEligibility(true);
      } else {
        setRejectingEligibility(true);
      }

      const response = await fetch("/api/document-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          action: action, // 'approve' یا 'reject'
          comment: comment,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowReviewModal(false);
        setSelectedRequest(null);
        setReviewData({});
        fetchAppealRequests(); // بازخوانی لیست
      } else {
        toast.error(data.error || "خطا در عملیات");
      }
    } catch (error) {
      console.error("Error in eligibility decision:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      // خاموش کردن لودینگ مخصوص هر دکمه
      if (action === "approve") {
        setApprovingEligibility(false);
      } else {
        setRejectingEligibility(false);
      }
    }
  };

  // ذخیره بررسی
  const handleSaveReview = async () => {
    try {
      setSubmitting(true);
      const response = await fetch("/api/document-review", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          reviewData: reviewData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("بررسی با موفقیت ذخیره شد و وضعیت کاربر به‌روزرسانی شد");
        setIsDataSaved(true); // تنظیم ذخیره شدن تغییرات

        // به‌روزرسانی درخواست انتخاب شده با داده‌های جدید
        if (data.updatedRequest) {
          console.log(
            "به‌روزرسانی selectedRequest با داده جدید:",
            data.updatedRequest
          );
          setSelectedRequest(data.updatedRequest);
        }

        fetchAppealRequests(); // بازیابی لیست به‌روز

        // مدال را بسته نمی‌کنیم تا کاربر بتواند دکمه‌های مشمولیت را ببیند
        // setShowReviewModal(false);
        // setSelectedRequest(null);
        // setReviewData({});
      } else {
        toast.error(data.error || "خطا در ذخیره بررسی");
      }
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("خطا در ذخیره بررسی");
    } finally {
      setSubmitting(false);
    }
  };

  // باز کردن مدال نظر مبدا
  const openSourceOpinionModal = (personnel, opinionType) => {
    setSelectedPersonnel(personnel);
    setSourceOpinionType(opinionType);
    setSelectedReasons([]);
    setSourceComment("");
    setShowSourceOpinionModal(true);
  };

  // بستن مدال نظر مبدا
  const closeSourceOpinionModal = () => {
    setShowSourceOpinionModal(false);
    setSelectedPersonnel(null);
    setSourceOpinionType(null);
    setSelectedReasons([]);
    setSourceComment("");
  };

  // ثبت نظر مبدا (موافقت یا مخالفت)
  const handleSourceOpinion = async () => {
    if (selectedReasons.length === 0) {
      toast.error("لطفاً حداقل یک دلیل انتخاب کنید");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/source-opinion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personnelCode: selectedPersonnel.personnelCode,
          action: sourceOpinionType,
          reasonIds: selectedReasons,
          comment: sourceComment.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        closeSourceOpinionModal();
        fetchAppealRequests(); // بازیابی لیست به‌روز
      } else {
        toast.error(data.error || "خطا در ثبت نظر");
      }
    } catch (error) {
      console.error("Error submitting source opinion:", error);
      toast.error("خطا در ثبت نظر");
    } finally {
      setSubmitting(false);
    }
  };

  // بررسی اینکه آیا دکمه‌های نظر مبدا نمایش داده شوند یا نه
  const shouldShowSourceOpinionButtons = (request) => {
    const validStatuses = [
      "exception_eligibility_approval",
      "province_approval",
    ];
    return validStatuses.includes(request.currentRequestStatus);
  };

  // بررسی اینکه آیا دکمه‌های بررسی مستندات فعال باشند یا نه
  const canPerformDocumentReview = (request) => {
    console.log("canPerformDocumentReview - request:", request);
    console.log(
      "canPerformDocumentReview - currentRequestStatus:",
      request?.currentRequestStatus
    );

    const validStatuses = [
      "user_approval",
      "source_review",
      "exception_eligibility_approval",
      "exception_eligibility_rejection",
    ];
    const result = validStatuses.includes(request?.currentRequestStatus);
    console.log("canPerformDocumentReview - result:", result);
    return result;
  };

  // دریافت پیام عدم دسترسی برای بررسی مستندات
  const getDocumentReviewDisabledMessage = (request) => {
    if (!request.currentRequestStatus) {
      return "وضعیت درخواست مشخص نیست";
    }

    const currentStatusText = getStatusPersianText(
      request.currentRequestStatus
    );
    return `بررسی مستندات تنها برای درخواست‌های با وضعیت "تایید کاربر"، "در حال بررسی مبدا"، "تایید مشمولیت استثنا" یا "رد مشمولیت استثنا" امکان‌پذیر است. وضعیت فعلی: ${currentStatusText}`;
  };

  // ترجمه وضعیت به فارسی
  const getStatusPersianText = (status) => {
    const statusMap = {
      // وضعیت‌های اولیه
      pending: "در انتظار بررسی",
      submitted: "ارسال شده",
      under_review: "در حال بررسی",

      // وضعیت‌های کاربر
      user_no_action: "عدم اقدام کاربر",
      awaiting_user_approval: "در انتظار تایید کاربر",
      user_approval: "تایید کاربر",

      // وضعیت‌های بررسی مستندات
      source_review: "در حال بررسی مبدا",
      exception_eligibility_approval: "تایید مشمولیت استثنا",
      exception_eligibility_rejection: "رد مشمولیت استثنا",

      // وضعیت‌های نظر مبدا
      source_approval: "موافقت مبدا",
      source_rejection: "مخالفت مبدا",

      // وضعیت‌های استان
      province_review: "در حال بررسی استان",
      province_approval: "تایید استان",
      province_rejection: "رد استان",

      // وضعیت‌های مقصد
      // destination_review: "در حال بررسی مقصد",
      destination_approval: "تایید مقصد",
      destination_rejection: "رد مقصد",

      // وضعیت‌های نهایی
      final_approval: "تایید نهایی",
      final_rejection: "رد نهایی",
      completed: "تکمیل شده",
      cancelled: "لغو شده",
      archived: "بایگانی شده",
    };

    return statusMap[status] || status;
  };

  useEffect(() => {
    if (
      user &&
      ["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      fetchAppealRequests();
      fetchApprovalReasons();
    }
  }, [user]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">بررسی مستندات و تاییدات</h1>
                <p className="text-blue-100 text-sm">
                  {user.role === "districtTransferExpert"
                    ? "بررسی درخواست‌های تجدید نظر منطقه"
                    : "بررسی درخواست‌های تجدید نظر استان"}
                </p>
                {appealRequests.length > 0 &&
                  appealRequests[0].academicYear && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs text-blue-100">
                        <FaCalendarAlt className="h-3 w-3" />
                        سال تحصیلی: {appealRequests[0].academicYear}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* کاشی‌های وضعیت */}
          <div className="bg-gray-50 border-b border-gray-200">
            {/* هدر قابل کلیک */}
            <div
              className="p-6 cursor-pointer hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
              onClick={() => setShowStats(!showStats)}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                آمار وضعیت درخواست‌ها
              </h2>
              <div className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                <span className="text-sm font-medium">
                  {showStats ? "مخفی کردن آمار" : "نمایش آمار"}
                </span>
                {showStats ? (
                  <FaChevronUp className="h-4 w-4" />
                ) : (
                  <FaChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* محتوای آمار */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showStats ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {statusOptions.map((status) => {
                    const IconComponent = status.icon;
                    const count = statusCounts[status.value] || 0;
                    const isActive = statusFilter === status.value;

                    return (
                      <div
                        key={status.value}
                        onClick={() => setStatusFilter(status.value)}
                        className={`
                      cursor-pointer rounded-xl border-2 transition-all duration-200 transform hover:scale-105
                      ${
                        isActive
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                      }
                    `}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`p-2 rounded-lg ${status.color} text-white`}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span
                              className={`text-2xl font-bold ${
                                isActive ? "text-blue-600" : "text-gray-700"
                              }`}
                            >
                              {count}
                            </span>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-medium ${
                                isActive ? "text-blue-700" : "text-gray-600"
                              }`}
                            >
                              {status.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* جستجو */}
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="جستجو بر اساس نام، کد ملی یا کد پرسنلی..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* فیلتر وضعیت */}
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="in_review">در حال بررسی</option>
                  <option value="completed">تکمیل شده</option>
                </select>
              </div>

              {/* دکمه دریافت گزارش اکسل */}
              <div className="md:w-64">
                <button
                  onClick={handleExportToExcel}
                  disabled={exportingExcel || filteredRequests.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="دریافت گزارش کامل اکسل"
                >
                  {exportingExcel ? (
                    <>
                      <FaSpinner className="h-4 w-4 animate-spin" />
                      در حال تولید گزارش...
                    </>
                  ) : (
                    <>
                      <FaFileExcel className="h-4 w-4" />
                      گزارش کامل اکسل
                    </>
                  )}
                </button>
              </div>

              {/* تعداد نتایج */}
              <div className="flex items-center text-sm text-gray-600">
                <FaFilter className="h-4 w-4 ml-2" />
                {filteredRequests.length} درخواست یافت شد
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">در حال بارگذاری...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FaExclamationTriangle className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              درخواستی یافت نشد
            </h3>
            <p className="text-gray-600">
              {appealRequests.length === 0
                ? "هیچ درخواست تجدید نظری برای بررسی یافت نشد."
                : "درخواستی با فیلترهای انتخابی یافت نشد."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اطلاعات متقاضی
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      دلایل انتخابی
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت پرسنل
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ درخواست
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت بررسی
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      آخرین بروزرسانی
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      پیام‌ها
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {request.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            کد ملی: {request.nationalId}
                          </div>
                          <div className="text-sm text-gray-500">
                            کد پرسنلی: {request.personnelCode}
                          </div>
                          {request.phone && (
                            <div className="text-sm text-gray-500">
                              تلفن: {request.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm text-gray-900">
                          {request.selectedReasons?.length || 0} دلیل انتخابی
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {request.selectedReasons
                            ?.slice(0, 2)
                            ?.map((reason) =>
                              typeof reason === "string"
                                ? reason
                                : reason?.title || reason?.name || "[نامشخص]"
                            )
                            ?.join(", ")}
                          {request.selectedReasons?.length > 2 && "..."}
                        </div>
                      </td>

                      {/* ستون وضعیت پرسنل */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {request.currentRequestStatus ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPersonnelStatusColor(
                              request.currentRequestStatus
                            )}`}
                          >
                            {getPersonnelStatusIcon(
                              request.currentRequestStatus
                            )}
                            {getPersonnelStatusText(
                              request.currentRequestStatus
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            <FaExclamationTriangle className="h-3 w-3" />
                            نامشخص
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>
                            {new Date(request.createdAt).toLocaleDateString(
                              "fa-IR"
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(request.createdAt).toLocaleTimeString(
                              "fa-IR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                            request.overallReviewStatus || "pending"
                          )}`}
                        >
                          {getStatusIcon(
                            request.overallReviewStatus || "pending"
                          )}
                          {getStatusText(
                            request.overallReviewStatus || "pending"
                          )}
                        </span>
                      </td>

                      {/* ستون آخرین بروزرسانی */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>
                            {new Date(request.updatedAt).toLocaleDateString(
                              "fa-IR"
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(request.updatedAt).toLocaleTimeString(
                              "fa-IR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ستون پیام‌ها */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <ChatButton
                          appealRequestId={request._id}
                          unreadCount={(() => {
                            const unreadMessages = (
                              request.chatMessages || []
                            ).filter(
                              (msg) =>
                                !msg.isRead &&
                                msg.senderRole === "transferApplicant"
                            );
                            return unreadMessages.length;
                          })()}
                          chatStatus={request.chatStatus || "open"}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openReviewModal(request)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                          >
                            <FaEye className="h-3 w-3" />
                            بررسی وضعیت شمولیت
                          </button>

                          {true && (
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  openSourceOpinionModal(request, "approve")
                                }
                                disabled={
                                  !shouldShowSourceOpinionButtons(request)
                                }
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="موافقت با انتقال"
                              >
                                <FaThumbsUp className="h-3 w-3" />
                                ثبت موافقت با انتقال
                              </button>
                              <button
                                onClick={() =>
                                  openSourceOpinionModal(request, "reject")
                                }
                                disabled={
                                  !shouldShowSourceOpinionButtons(request)
                                }
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="مخالفت با انتقال"
                              >
                                <FaThumbsDown className="h-3 w-3" />
                                ثبت مخالفت با انتقال
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredRequests.length > 0 && (
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* اطلاعات صفحه */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      نمایش {startIndex + 1} تا {Math.min(endIndex, totalItems)}{" "}
                      از {totalItems} درخواست
                    </span>

                    {/* انتخاب تعداد آیتم در هر صفحه */}
                    <div className="flex items-center gap-2">
                      <span>نمایش:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) =>
                          handleItemsPerPageChange(Number(e.target.value))
                        }
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span>در هر صفحه</span>
                    </div>
                  </div>

                  {/* دکمه‌های ناوبری */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      {/* دکمه اول */}
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="صفحه اول"
                      >
                        <FaAngleDoubleLeft className="h-3 w-3" />
                      </button>

                      {/* دکمه قبلی */}
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="صفحه قبل"
                      >
                        <FaChevronLeft className="h-3 w-3" />
                        قبلی
                      </button>

                      {/* شماره‌های صفحه */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const pages = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(
                            1,
                            currentPage - Math.floor(maxVisiblePages / 2)
                          );
                          let endPage = Math.min(
                            totalPages,
                            startPage + maxVisiblePages - 1
                          );

                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(
                              1,
                              endPage - maxVisiblePages + 1
                            );
                          }

                          // صفحه اول
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => goToPage(1)}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                1
                              </button>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <span
                                  key="ellipsis1"
                                  className="px-2 text-gray-500"
                                >
                                  ...
                                </span>
                              );
                            }
                          }

                          // صفحات میانی
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => goToPage(i)}
                                className={`px-3 py-2 text-sm border rounded-lg ${
                                  currentPage === i
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }

                          // صفحه آخر
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span
                                  key="ellipsis2"
                                  className="px-2 text-gray-500"
                                >
                                  ...
                                </span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => goToPage(totalPages)}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                {totalPages}
                              </button>
                            );
                          }

                          return pages;
                        })()}
                      </div>

                      {/* دکمه بعدی */}
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="صفحه بعد"
                      >
                        بعدی
                        <FaChevronRight className="h-3 w-3" />
                      </button>

                      {/* دکمه آخر */}
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="صفحه آخر"
                      >
                        <FaAngleDoubleRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal بررسی مستندات */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-lg">
                      <FaCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        بررسی و اظهارنظر مبدأ{" "}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {selectedRequest.fullName} -{" "}
                        {selectedRequest.nationalId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* اطلاعات متقاضی */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    اطلاعات متقاضی
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        نام و نام خانوادگی:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest.fullName}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        کد ملی:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest.nationalId}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        کد پرسنلی:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest.personnelCode}
                      </div>
                    </div>
                    {selectedRequest.phone && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          شماره تماس:
                        </span>
                        <div className="text-gray-900">
                          {selectedRequest.phone}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        رشته شغلی:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest?.employmentField || "نامشخص"}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        سنوات مؤثر:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest?.effectiveYears || "نامشخص"}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        جمع امتیاز تایید شده :
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest?.approvedScore || "نامشخص"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* توضیحات کاربر */}
                {selectedRequest.userComments && (
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <FaUser className="h-4 w-4" />
                        توضیحات کاربر
                      </h4>
                      <div className="bg-white rounded p-3 border border-blue-200">
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedRequest.userComments}
                        </p>

                        {/* تصاویر پیوست */}
                        {selectedRequest.userCommentsImages &&
                          selectedRequest.userCommentsImages.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h6 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                                <FaFileAlt className="h-3 w-3" />
                                تصاویر پیوست (
                                {selectedRequest.userCommentsImages.length})
                              </h6>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedRequest.userCommentsImages.map(
                                  (image, index) => (
                                    <div
                                      key={index}
                                      className="bg-gray-50 border border-gray-200 rounded p-2"
                                    >
                                      <div className="flex items-center gap-1 mb-1">
                                        <FaFileAlt className="h-3 w-3 text-blue-500" />
                                        <span className="text-xs text-gray-700 truncate flex-1">
                                          {image.originalName}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mb-1">
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
                                        مشاهده
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

                {/* درخواست‌های اصلاح مشخصات */}
                {selectedRequest.profileCorrectionRequests &&
                  selectedRequest.profileCorrectionRequests.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FaFileAlt className="h-5 w-5 text-orange-500" />
                        درخواست‌های اصلاح مشخصات پرسنل
                      </h4>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="space-y-3">
                          {selectedRequest.profileCorrectionRequests.map(
                            (correctionRequest) => (
                              <div
                                key={correctionRequest._id}
                                className="bg-white border border-orange-200 rounded-lg p-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* فیلد مورد اعتراض */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">
                                      فیلد مورد اعتراض:
                                    </label>
                                    <p className="text-gray-800 font-medium">
                                      {getFieldDisplayName(
                                        correctionRequest.disputedField
                                      )}
                                    </p>
                                  </div>

                                  {/* وضعیت */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">
                                      وضعیت:
                                    </label>
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        correctionRequest.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : correctionRequest.status ===
                                            "under_review"
                                          ? "bg-blue-100 text-blue-800"
                                          : correctionRequest.status ===
                                            "approved"
                                          ? "bg-green-100 text-green-800"
                                          : correctionRequest.status ===
                                            "rejected"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {correctionRequest.status === "pending"
                                        ? "در انتظار بررسی"
                                        : correctionRequest.status ===
                                          "under_review"
                                        ? "در حال بررسی"
                                        : correctionRequest.status ===
                                          "approved"
                                        ? "تایید شده"
                                        : correctionRequest.status ===
                                          "rejected"
                                        ? "رد شده"
                                        : correctionRequest.status ===
                                          "cancelled"
                                        ? "لغو شده"
                                        : correctionRequest.status}
                                    </span>
                                  </div>

                                  {/* تاریخ ایجاد */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">
                                      تاریخ ایجاد:
                                    </label>
                                    <p className="text-gray-800 text-sm">
                                      {new Date(
                                        correctionRequest.createdAt
                                      ).toLocaleDateString("fa-IR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                  </div>
                                </div>

                                {/* توضیحات */}
                                <div className="mt-3">
                                  <label className="text-sm font-medium text-gray-600">
                                    توضیحات:
                                  </label>
                                  <p className="text-gray-800 text-sm mt-1 bg-gray-50 p-3 rounded-md">
                                    {correctionRequest.description}
                                  </p>
                                </div>

                                {/* تصویر پیوست */}
                                {correctionRequest.attachmentImage && (
                                  <div className="mt-3">
                                    <label className="text-sm font-medium text-gray-600">
                                      تصویر پیوست:
                                    </label>
                                    <div className="mt-2">
                                      <a
                                        href={correctionRequest.attachmentImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        <FaDownload className="h-4 w-4" />
                                        مشاهده تصویر
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {/* پاسخ کارشناس */}
                                {correctionRequest.expertResponse && (
                                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <label className="text-sm font-medium text-blue-800">
                                      پاسخ کارشناس:
                                    </label>
                                    <p className="text-blue-800 text-sm mt-1">
                                      {correctionRequest.expertResponse}
                                    </p>
                                    {correctionRequest.respondedBy && (
                                      <p className="text-blue-600 text-xs mt-2">
                                        پاسخ‌دهنده:{" "}
                                        {
                                          correctionRequest.respondedBy
                                            .firstName
                                        }{" "}
                                        {correctionRequest.respondedBy.lastName}
                                      </p>
                                    )}
                                    {correctionRequest.respondedAt && (
                                      <p className="text-blue-600 text-xs">
                                        تاریخ پاسخ:{" "}
                                        {new Date(
                                          correctionRequest.respondedAt
                                        ).toLocaleDateString("fa-IR", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* بررسی دلایل */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    بررسی دلایل انتخابی و مستندات
                  </h4>
                  <div className="space-y-4">
                    {selectedRequest.selectedReasons?.map((reason, index) => {
                      // اطلاعات اصلی دلیل (از selectedReasons)
                      const reasonTitle =
                        typeof reason === "string"
                          ? reason
                          : reason?.title ||
                            reason?.reasonTitle ||
                            reason?.name ||
                            "[نامشخص]";
                      const reasonKey = reason._id; // استفاده از _id درخواست selectedReasons
                      const reasonCode =
                        typeof reason === "string"
                          ? reason
                          : reason?.reasonCode;

                      // اطلاعات کامل دلیل (از TransferReason که populate شده)
                      const populatedReason = reason?.reasonId; // از populate
                      const fullReasonTitle =
                        populatedReason?.title || reasonTitle;
                      const fullReasonDescription =
                        populatedReason?.description ||
                        reason?.description ||
                        "";
                      const fullReasonCode =
                        populatedReason?.reasonCode || reasonCode;

                      // متن نهایی برای نمایش
                      const reasonText = fullReasonTitle;
                      const reasonDescription = fullReasonDescription;

                      // دریافت مستندات مربوط به این دلیل
                      // تلاش برای پیدا کردن مستندات با کلیدهای مختلف
                      // تلاش با کلیدهای مختلف برای پیدا کردن مستندات
                      let reasonDocuments = [];
                      const possibleKeys = [
                        // از populate شده TransferReason
                        populatedReason?._id?.toString(),
                        populatedReason?._id,
                        // از selectedReasons
                        reason?._id?.toString(),
                        reason?._id,
                        reason?.reasonId?._id?.toString(),
                        reason?.reasonId?._id,
                        reason?.reasonId?.toString(),
                        reason?.reasonId,
                        // کدهای دلیل
                        fullReasonCode,
                        reasonCode,
                        reasonKey,
                      ].filter(Boolean); // حذف مقادیر null/undefined

                      let documentKey = null;
                      for (const key of possibleKeys) {
                        if (selectedRequest.uploadedDocuments?.[key]) {
                          reasonDocuments =
                            selectedRequest.uploadedDocuments[key];
                          documentKey = key;
                          break;
                        }
                      }

                      // اگر هیچ مستندی پیدا نشد، از اولین کلید ممکن استفاده کن
                      if (!documentKey && possibleKeys.length > 0) {
                        documentKey = possibleKeys[0];
                      }

                      // Debug log (temporary)
                      // if (index === 0) {
                      //   console.log("Debug - Reason structure:", reason);
                      //   console.log("Debug - Reason title:", reasonTitle);
                      //   console.log(
                      //     "Debug - Reason reasonTitle:",
                      //     reason?.reasonTitle
                      //   );
                      //   console.log(
                      //     "Debug - Requires admin approval:",
                      //     populatedReason?.requiresAdminApproval
                      //   );
                      //   console.log(
                      //     "Debug - Requires document upload:",
                      //     populatedReason?.requiresDocumentUpload
                      //   );
                      //   console.log(
                      //     "Debug - Populated reason:",
                      //     populatedReason
                      //   );
                      //   console.log(
                      //     "Debug - Full reason title:",
                      //     fullReasonTitle
                      //   );
                      //   console.log(
                      //     "Debug - Full reason description:",
                      //     fullReasonDescription
                      //   );
                      //   console.log(
                      //     "Debug - Full reason code:",
                      //     fullReasonCode
                      //   );
                      //   console.log("Debug - Possible keys:", possibleKeys);
                      //   console.log(
                      //     "Debug - Document key selected:",
                      //     documentKey
                      //   );
                      //   console.log(
                      //     "Debug - uploadedDocuments keys:",
                      //     Object.keys(selectedRequest.uploadedDocuments || {})
                      //   );
                      //   console.log(
                      //     "Debug - reasonDocuments found:",
                      //     reasonDocuments
                      //   );
                      //   console.log(
                      //     "Debug - reasonDocuments length:",
                      //     reasonDocuments?.length || 0
                      //   );
                      //   console.log(
                      //     "Debug - Match found:",
                      //     !!documentKey && reasonDocuments?.length > 0
                      //   );
                      // }

                      return (
                        <div
                          key={index}
                          className="border border-gray-400 rounded-lg p-4 bg-gray-50"
                        >
                          {/* عنوان دلیل */}
                          <div className="mb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* عنوان اصلی دلیل */}
                                <h5 className="font-medium text-gray-800 mb-2">
                                  {reasonText}
                                </h5>

                                {/* عنوان کامل دلیل */}
                                {populatedReason?.title &&
                                  populatedReason.title !== reasonTitle && (
                                    <p className="text-sm font-medium text-purple-700 mb-1">
                                      📌 {populatedReason.title}
                                    </p>
                                  )}

                                {/* عنوان اضافی از selectedReasons */}
                                {reason?.reasonTitle &&
                                  reason.reasonTitle !== reasonTitle &&
                                  reason.reasonTitle !==
                                    populatedReason?.title && (
                                    <p className="text-sm font-medium text-orange-700 mb-1">
                                      🏷️ {reason.reasonTitle}
                                    </p>
                                  )}

                                {/* دسته‌بندی دلیل */}
                                {populatedReason?.category && (
                                  <p className="text-xs text-indigo-600 mb-2">
                                    🗂️ دسته‌بندی: {populatedReason.category}
                                  </p>
                                )}

                                {/* کد دلیل */}
                                {/* {fullReasonCode && (
                                  <p className="text-xs text-gray-500 mb-1">
                                    🏷️ کد بند: {fullReasonCode}
                                  </p>
                                )} */}

                                {/* توضیحات دلیل */}
                                {reasonDescription && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                    <h6 className="text-xs font-medium text-blue-700 mb-1">
                                      📝 توضیحات بند:
                                    </h6>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                      {reasonDescription}
                                    </p>
                                  </div>
                                )}

                                {/* الزامات دلیل */}
                                <div className="mt-2 mb-3">
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <h6 className="text-xs font-medium text-gray-700 mb-2">
                                      📋 الزامات این بند:
                                    </h6>
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* نیاز به تایید کارشناس */}
                                      <div className="flex items-center gap-2">
                                        {populatedReason?.requiresAdminApproval ? (
                                          <>
                                            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                                            <span className="text-xs text-orange-700">
                                              نیاز به بررسی کارشناس
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                            <span className="text-xs text-gray-600">
                                              کارشناس بدون نیاز به تایید
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* نیاز به بارگذاری مدرک */}
                                      <div className="flex items-center gap-2">
                                        {populatedReason?.requiresDocumentUpload ? (
                                          <>
                                            <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                                            <span className="text-xs text-purple-700">
                                              نیاز به بارگذاری مدرک
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                                            <span className="text-xs text-teal-700">
                                              بدون نیاز به مدرک
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* نیاز به زوج فرهنگی */}
                                      <div className="flex items-center gap-2 col-span-2">
                                        {populatedReason?.isCulturalCouple ? (
                                          <>
                                            <div className="h-2 w-2 bg-pink-500 rounded-full"></div>
                                            <span className="text-xs text-pink-700">
                                              نیاز به اطلاعات زوج فرهنگی
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                                            <span className="text-xs text-blue-600">
                                              بدون نیاز به اطلاعات زوج فرهنگی
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* بررسی سنوات */}
                                      {populatedReason?.yearsLimit && (
                                        <div className="flex items-center gap-2 col-span-2">
                                          {(selectedRequest?.effectiveYears ||
                                            0) < populatedReason.yearsLimit ? (
                                            <>
                                              <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                                              <span className="text-xs text-red-700">
                                                هشدار: سنوات ناکافی برای مشمولیت
                                                این بند (سنوات پرسنل:{" "}
                                                {selectedRequest?.effectiveYears ||
                                                  0}{" "}
                                                سال، حداقل مورد نیاز:{" "}
                                                {populatedReason.yearsLimit}{" "}
                                                سال)
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                              <span className="text-xs text-green-700">
                                                سنوات کافی برای مشمولیت این بند
                                                (سنوات پرسنل:{" "}
                                                {selectedRequest?.effectiveYears ||
                                                  0}{" "}
                                                سال، حداقل مورد نیاز:{" "}
                                                {populatedReason.yearsLimit}{" "}
                                                سال)
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                {/* دکمه‌های تایید/رد فقط برای دلایلی که نیاز به تایید کارشناس دارند */}
                                {populatedReason?.requiresAdminApproval ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        setReviewData((prev) => ({
                                          ...prev,
                                          [reasonKey]: "approved",
                                        }))
                                      }
                                      className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                        reviewData[reasonKey] === "approved"
                                          ? "bg-green-100 text-green-800 border border-green-300"
                                          : "bg-gray-100 text-gray-600 hover:bg-green-50"
                                      }`}
                                    >
                                      <FaCheck className="h-3 w-3" />
                                      تایید
                                    </button>
                                    <button
                                      onClick={() =>
                                        setReviewData((prev) => ({
                                          ...prev,
                                          [reasonKey]: "rejected",
                                        }))
                                      }
                                      className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                        reviewData[reasonKey] === "rejected"
                                          ? "bg-red-100 text-red-800 border border-red-300"
                                          : "bg-gray-100 text-gray-600 hover:bg-red-50"
                                      }`}
                                    >
                                      <FaTimes className="h-3 w-3" />
                                      رد
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* اطلاعات زوج فرهنگی - فقط اگر این دلیل نیاز به زوج فرهنگی دارد */}
                          {populatedReason?.isCulturalCouple &&
                            selectedRequest.culturalCoupleInfo &&
                            selectedRequest.culturalCoupleInfo
                              .personnelCode && (
                              <div className="mb-3 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                                <h6 className="text-sm font-medium text-pink-800 mb-3 flex items-center gap-2">
                                  <FaUser className="h-4 w-4" />
                                  اطلاعات زوج فرهنگی
                                </h6>
                                <div className="grid grid-cols-1 gap-3">
                                  {/* کد پرسنلی همسر */}
                                  <div className="bg-white rounded p-3 border border-pink-200">
                                    <label className="text-xs font-medium text-pink-700 block mb-1">
                                      کد پرسنلی همسر:
                                    </label>
                                    <p className="text-sm text-gray-800 font-mono">
                                      {
                                        selectedRequest.culturalCoupleInfo
                                          .personnelCode
                                      }
                                    </p>
                                  </div>

                                  {/* منطقه همسر */}
                                  {selectedRequest.culturalCoupleInfo
                                    .districtName && (
                                    <div className="bg-white rounded p-3 border border-pink-200">
                                      <label className="text-xs font-medium text-pink-700 block mb-1">
                                        منطقه خدمت همسر:
                                      </label>
                                      <p className="text-sm text-gray-800">
                                        {
                                          selectedRequest.culturalCoupleInfo
                                            .districtName
                                        }
                                        {selectedRequest.culturalCoupleInfo
                                          .districtCode && (
                                          <span className="text-xs text-gray-500 mr-2">
                                            (کد:{" "}
                                            {
                                              selectedRequest.culturalCoupleInfo
                                                .districtCode
                                            }
                                            )
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  )}

                                  {/* بررسی وضعیت نظرات منطقه */}
                                  {(() => {
                                    const hasOpinion =
                                      selectedRequest.culturalCoupleInfo
                                        .spouseDistrictOpinion;
                                    const hasDescription =
                                      selectedRequest.culturalCoupleInfo
                                        .spouseDistrictDescription;
                                    const hasDecision =
                                      selectedRequest.culturalCoupleInfo
                                        .spouseDistrictDecision;

                                    // اگر هیچ نظری ثبت نشده، پیام انتظار نمایش داده شود
                                    if (
                                      !hasOpinion &&
                                      !hasDescription &&
                                      !hasDecision
                                    ) {
                                      return (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                          <div className="flex items-center gap-2">
                                            <div className="animate-pulse">
                                              <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                                            </div>
                                            <label className="text-xs font-medium text-yellow-700">
                                              در انتظار بررسی منطقه خدمت همسر
                                            </label>
                                          </div>
                                          <p className="text-sm text-yellow-800 mt-1">
                                            نظر منطقه خدمت همسر هنوز ثبت نشده
                                            است
                                          </p>
                                        </div>
                                      );
                                    }

                                    // در غیر این صورت، نظرات موجود نمایش داده شود
                                    return (
                                      <>
                                        {/* نظر منطقه خدمت همسر */}
                                        {hasOpinion && (
                                          <div className="bg-white rounded p-3 border border-pink-200">
                                            <label className="text-xs font-medium text-pink-700 block mb-1">
                                              نظر منطقه خدمت همسر:
                                            </label>
                                            <p className="text-sm text-gray-800">
                                              {
                                                selectedRequest
                                                  .culturalCoupleInfo
                                                  .spouseDistrictOpinion
                                              }
                                            </p>
                                          </div>
                                        )}

                                        {/* توضیحات منطقه خدمت همسر */}
                                        {hasDescription && (
                                          <div className="bg-white rounded p-3 border border-pink-200">
                                            <label className="text-xs font-medium text-pink-700 block mb-1">
                                              توضیحات منطقه خدمت همسر:
                                            </label>
                                            <p className="text-sm text-gray-800 leading-relaxed">
                                              {
                                                selectedRequest
                                                  .culturalCoupleInfo
                                                  .spouseDistrictDescription
                                              }
                                            </p>
                                          </div>
                                        )}

                                        {/* تصمیم منطقه خدمت همسر */}
                                        {hasDecision && (
                                          <div className="bg-white rounded p-3 border border-pink-200">
                                            <label className="text-xs font-medium text-pink-700 block mb-1">
                                              بررسی منطقه خدمت همسر:
                                            </label>
                                            <span
                                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                selectedRequest
                                                  .culturalCoupleInfo
                                                  .spouseDistrictDecision ===
                                                "approve"
                                                  ? "bg-green-100 text-green-800"
                                                  : selectedRequest
                                                      .culturalCoupleInfo
                                                      .spouseDistrictDecision ===
                                                    "reject"
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-gray-100 text-gray-800"
                                              }`}
                                            >
                                              {selectedRequest
                                                .culturalCoupleInfo
                                                .spouseDistrictDecision ===
                                              "approve"
                                                ? "✅ تایید"
                                                : selectedRequest
                                                    .culturalCoupleInfo
                                                    .spouseDistrictDecision ===
                                                  "reject"
                                                ? "❌ رد"
                                                : selectedRequest
                                                    .culturalCoupleInfo
                                                    .spouseDistrictDecision}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                          {/* مستندات بارگذاری شده */}
                          {reasonDocuments && reasonDocuments.length > 0 && (
                            <div className="mb-3 p-3 bg-white rounded border">
                              <h6 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <FaFileAlt className="h-3 w-3" />
                                مستندات بارگذاری شده ({reasonDocuments.length})
                              </h6>
                              <div className="space-y-2">
                                {reasonDocuments
                                  .filter((doc) => doc) // فقط نمایش مستندات موجود
                                  .map((doc, docIndex) => (
                                    <div
                                      key={docIndex}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FaFileAlt className="h-3 w-3 text-blue-500" />
                                        <span className="text-gray-700">
                                          {doc.originalName || doc.fileName}
                                        </span>
                                        {doc.uploadedAt && (
                                          <span className="text-xs text-gray-500">
                                            (
                                            {new Date(
                                              doc.uploadedAt
                                            ).toLocaleDateString("fa-IR")}
                                            )
                                          </span>
                                        )}
                                      </div>
                                      <a
                                        href={`/api/transfer-applicant/download-document/${doc.fileName}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                      >
                                        <FaDownload className="h-3 w-3" />
                                        دانلود
                                      </a>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* در صورت عدم وجود مستندات و نیاز به مدرک */}
                          {(!reasonDocuments || reasonDocuments.length === 0) &&
                            populatedReason?.requiresDocumentUpload && (
                              <div className="mb-3 p-3 rounded bg-yellow-50 border border-yellow-200">
                                <p className="text-sm flex items-center gap-1 text-yellow-700">
                                  <FaExclamationTriangle className="h-3 w-3" />
                                  هیچ مدرکی برای این دلیل بارگذاری نشده است
                                </p>
                                <p className="text-xs text-yellow-600 mt-1">
                                  برای این دلیل باید حداقل یک مدرک بارگذاری شود
                                </p>
                              </div>
                            )}

                          {/* فیلد توضیحات کارشناس */}
                          <div className="mt-3">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FaUser className="h-3 w-3 text-indigo-600" />
                                <label className="text-xs font-medium text-indigo-700">
                                  توضیحات کارشناس (اختیاری):
                                </label>
                              </div>
                              <textarea
                                placeholder="نظر، توضیحات یا دلیل تصمیم خود را برای این دلیل وارد کنید..."
                                className="w-full px-3 py-2 border border-indigo-300 rounded text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                rows={3}
                                value={reviewData[`${reasonKey}_comment`] || ""}
                                onChange={(e) =>
                                  setReviewData((prev) => ({
                                    ...prev,
                                    [`${reasonKey}_comment`]: e.target.value,
                                  }))
                                }
                              />
                              {/* نمایش اطلاعات بررسی موجود */}
                              <div className="mt-2 space-y-1">
                                {/* وضعیت بررسی */}
                                {reviewData[reasonKey] &&
                                  reviewData[reasonKey] !== "pending" && (
                                    <div className="text-xs">
                                      <span className="text-indigo-600">
                                        🔍 وضعیت بررسی:{" "}
                                      </span>
                                      <span
                                        className={`font-medium ${
                                          reviewData[reasonKey] === "approved"
                                            ? "text-green-700"
                                            : "text-red-700"
                                        }`}
                                      >
                                        {reviewData[reasonKey] === "approved"
                                          ? "تایید شده"
                                          : "رد شده"}
                                      </span>
                                    </div>
                                  )}

                                {/* بررسی قبلی توسط کارشناس */}
                                {reason.review && reason.review.reviewedBy && (
                                  <div className="text-xs text-gray-600">
                                    <span className="text-indigo-600">
                                      👤 آخرین بررسی:{" "}
                                    </span>
                                    <span>
                                      {new Date(
                                        reason.review.reviewedAt
                                      ).toLocaleDateString("fa-IR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}{" "}
                                      -{" "}
                                      {reason.review.reviewerRole ===
                                      "districtTransferExpert"
                                        ? " کارشناس منطقه"
                                        : " کارشناس استان"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="space-y-4 pt-4 border-t">
                  {/* بررسی وضعیت برای فعال/غیرفعال کردن دکمه‌ها */}
                  {!canPerformDocumentReview(selectedRequest) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <FaExclamationTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-red-800 block">
                            امکان بررسی مستندات وجود ندارد
                          </span>
                          <span className="text-xs text-red-700 mt-1 block">
                            {getDocumentReviewDisabledMessage(selectedRequest)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* دکمه‌های اصلی */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      بستن
                    </button>
                    <button
                      onClick={handleSaveReview}
                      disabled={
                        submitting || !canPerformDocumentReview(selectedRequest)
                      }
                      className={`${
                        isDataSaved
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      } disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2`}
                      title={
                        !canPerformDocumentReview(selectedRequest)
                          ? getDocumentReviewDisabledMessage(selectedRequest)
                          : isDataSaved
                          ? "تغییرات ذخیره شده - حالا می‌توانید دکمه‌های مشمولیت را استفاده کنید"
                          : "ذخیره تغییرات جهت فعال‌سازی دکمه‌های مشمولیت"
                      }
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          در حال ذخیره...
                        </>
                      ) : (
                        <>
                          <FaCheck className="h-4 w-4" />
                          {isDataSaved ? "ذخیره شده ✓" : "ذخیره تغییرات"}
                        </>
                      )}
                    </button>
                  </div>

                  {/* پیام هشدار برای ذخیره تغییرات */}
                  {!isDataSaved &&
                    canPerformDocumentReview(selectedRequest) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <FaInfoCircle className="text-yellow-600" />
                          <span className="text-sm text-yellow-800">
                            برای فعال‌سازی دکمه‌های تایید/رد مشمولیت، ابتدا باید
                            تغییرات را ذخیره کنید
                          </span>
                        </div>
                      </div>
                    )}

                  {/* دکمه‌های تایید/رد مشمولیت */}
                  {canPerformDocumentReview(selectedRequest) &&
                    (() => {
                      const buttonsState =
                        getFinalEligibilityButtonsState(selectedRequest);

                      if (!buttonsState.showButtons) {
                        return (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FaInfoCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800">
                                {buttonsState.message}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-blue-800 mb-1">
                              🎯 تصمیم‌گیری نهایی مشمولیت استثنا
                            </h4>
                            <p className="text-xs text-blue-700">
                              {buttonsState.message}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                handleEligibilityDecision("approve")
                              }
                              disabled={
                                approvingEligibility ||
                                rejectingEligibility ||
                                !buttonsState.canApprove
                              }
                              className={`${
                                buttonsState.canApprove
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-gray-400 cursor-not-allowed"
                              } disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm`}
                            >
                              {approvingEligibility ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  در حال تایید...
                                </>
                              ) : (
                                <>
                                  <FaCheck className="h-4 w-4" />
                                  تایید مشمولیت
                                </>
                              )}
                            </button>

                            <button
                              onClick={() =>
                                handleEligibilityDecision("reject")
                              }
                              disabled={
                                approvingEligibility ||
                                rejectingEligibility ||
                                !buttonsState.canReject
                              }
                              className={`${
                                buttonsState.canReject
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-gray-400 cursor-not-allowed"
                              } disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm`}
                            >
                              {rejectingEligibility ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  در حال رد...
                                </>
                              ) : (
                                <>
                                  <FaTimes className="h-4 w-4" />
                                  رد مشمولیت
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* مدال اعلام نظر مبدا */}
        {showSourceOpinionModal && selectedPersonnel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div
                className={`bg-gradient-to-r ${
                  sourceOpinionType === "approve"
                    ? "from-green-500 to-emerald-500"
                    : "from-red-500 to-rose-500"
                } p-6`}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-lg">
                      {sourceOpinionType === "approve" ? (
                        <FaThumbsUp className="h-6 w-6" />
                      ) : (
                        <FaThumbsDown className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        {sourceOpinionType === "approve"
                          ? "موافقت با انتقال"
                          : "مخالفت با انتقال"}
                      </h3>
                      <p className="text-sm opacity-90">
                        اعلام نظر مبدا برای {selectedPersonnel.fullName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeSourceOpinionModal}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* اطلاعات پرسنل */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">
                    اطلاعات پرسنل:
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">نام و نام خانوادگی:</span>
                      <span className="font-medium mr-2">
                        {selectedPersonnel.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">کد ملی:</span>
                      <span className="font-medium mr-2">
                        {selectedPersonnel.nationalId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">کد پرسنلی:</span>
                      <span className="font-medium mr-2">
                        {selectedPersonnel.personnelCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">وضعیت فعلی:</span>
                      <span className="font-medium mr-2">
                        {getStatusPersianText(
                          selectedPersonnel.currentRequestStatus
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* انتخاب دلایل */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {sourceOpinionType === "approve"
                      ? "دلایل موافقت:"
                      : "دلایل مخالفت:"}
                    <span className="text-red-500">*</span>
                  </label>

                  {loadingReasons ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="mr-2 text-gray-600">
                        در حال بارگذاری دلایل...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {(sourceOpinionType === "approve"
                        ? approvalReasons.approval
                        : approvalReasons.rejection
                      ).map((reason) => (
                        <label
                          key={reason._id}
                          className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedReasons.includes(reason._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReasons((prev) => [
                                  ...prev,
                                  reason._id,
                                ]);
                              } else {
                                setSelectedReasons((prev) =>
                                  prev.filter((id) => id !== reason._id)
                                );
                              }
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {reason.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              کد: {reason.code}
                            </div>
                          </div>
                        </label>
                      ))}

                      {(sourceOpinionType === "approve"
                        ? approvalReasons.approval
                        : approvalReasons.rejection
                      ).length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          هیچ دلیلی برای{" "}
                          {sourceOpinionType === "approve"
                            ? "موافقت"
                            : "مخالفت"}{" "}
                          تعریف نشده است
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* توضیحات */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات کارشناس (اختیاری):
                  </label>
                  <textarea
                    value={sourceComment}
                    onChange={(e) => setSourceComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder={`توضیحات مربوط به ${
                      sourceOpinionType === "approve" ? "موافقت" : "مخالفت"
                    } با انتقال...`}
                  />
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={closeSourceOpinionModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                    disabled={submitting}
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleSourceOpinion}
                    disabled={submitting || selectedReasons.length === 0}
                    className={`flex-1 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      sourceOpinionType === "approve"
                        ? "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                        : "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        در حال ثبت...
                      </div>
                    ) : (
                      <>
                        {sourceOpinionType === "approve" ? (
                          <>
                            <FaThumbsUp className="inline h-4 w-4 ml-2" />
                            ثبت موافقت با انتقال
                          </>
                        ) : (
                          <>
                            <FaThumbsDown className="inline h-4 w-4 ml-2" />
                            ثبت مخالفت با انتقال
                          </>
                        )}
                      </>
                    )}
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
