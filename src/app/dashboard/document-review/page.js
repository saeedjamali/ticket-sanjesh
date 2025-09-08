"use client";

import { useState, useEffect, useCallback } from "react";
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
  FaMapMarkerAlt,
  FaList,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import ChatButton from "@/components/chat/ChatButton";
import { getFieldDisplayName } from "@/lib/fieldTranslations";
import { useSidebar } from "@/context/SidebarContext";
import ImportantNotice from "@/components/ImportantNotice";

export default function DocumentReviewPage() {
  const { user, userLoading } = useUser();
  const {
    isOpen,
    toggleSidebar,
    openSubmenu,
    toggleSubmenu,
    isMobile,
    setIsOpen,
  } = useSidebar();
  // State برای کنترل دسترسی
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [accessCheckLoading, setAccessCheckLoading] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");

  // تابع ترجمه نوع انتقال
  const getTransferTypeText = (type) => {
    const typeMap = {
      permanent_preferred: "دائم (ترجیحی)",
      permanent_only: "فقط دائم",
      temporary_only: "فقط موقت",
      permanent: "دائم",
      temporary: "موقت",
    };
    return typeMap[type] || type || "-";
  };

  // تابع کمکی برای پیدا کردن نام منطقه بر اساس کد
  const getDistrictName = (districtCode) => {
    if (!districtCode || !helpers.districts) return "";
    const district = helpers.districts.find((d) => d.code === districtCode);
    return district ? district.name : "";
  };

  // تابع ترجمه وضعیت
  const getStatusText = (status) => {
    const statusMap = {
      user_no_action: "فاقد درخواست تجدیدنظر",
      awaiting_user_approval: "درخواست ناقص (منتظر تایید کاربر)",
      user_approval: "در انتظار بررسی مبدأ",
      source_review: "درحال بررسی مشمولیت",
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
    return statusMap[status] || status || "-";
  };
  const [appealRequests, setAppealRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employmentFieldFilter, setEmploymentFieldFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [districtCodeFilter, setDistrictCodeFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
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
  const [personnelStats, setPersonnelStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPersonnelListModal, setShowPersonnelListModal] = useState(false);
  const [personnelList, setPersonnelList] = useState([]);
  const [loadingPersonnelList, setLoadingPersonnelList] = useState(false);

  // State برای شرایط بندها
  const [clauseConditions, setClauseConditions] = useState([]);
  const [acceptedConditions, setAcceptedConditions] = useState([]);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [sourceOpinionTransferType, setSourceOpinionTransferType] =
    useState("");

  const [exportingExcel, setExportingExcel] = useState(false);
  const [helpers, setHelpers] = useState({
    employmentFields: [],
    genders: [],
    districts: [],
    districtCodes: [],
  });

  // تابع بررسی وضعیت تکمیل درخواست‌های زوج فرهنگی و اصلاح مشخصات
  const checkAccessRequirements = useCallback(async () => {
    setAccessCheckLoading(true);
    try {
      // بررسی وضعیت درخواست‌های زوج فرهنگی
      const culturalResponse = await fetch(
        "/api/cultural-couple-requests/completion-status",
        {
          credentials: "include",
        }
      );
      const culturalData = await culturalResponse.json();

      // بررسی وضعیت درخواست‌های اصلاح مشخصات
      const correctionResponse = await fetch(
        "/api/correction-requests/completion-status",
        {
          credentials: "include",
        }
      );
      const correctionData = await correctionResponse.json();

      if (culturalData.success && correctionData.success) {
        const culturalCompleted = culturalData.data.isCompleted;
        const correctionCompleted = correctionData.data.isCompleted;

        if (!culturalCompleted || !correctionCompleted) {
          setAccessRestricted(true);
          let message =
            "برای دسترسی به این صفحه، ابتدا باید موارد زیر را تکمیل کنید:\n";

          if (!culturalCompleted) {
            message += `• ${culturalData.data.pendingRequests} درخواست زوج فرهنگی در انتظار بررسی\n`;
          }

          if (!correctionCompleted) {
            message += `• ${correctionData.data.pendingRequests} درخواست اصلاح مشخصات در انتظار بررسی\n`;
          }

          setRestrictionMessage(message);
        } else {
          setAccessRestricted(false);
          setRestrictionMessage("");
        }
      } else {
        // در صورت خطا در API، اجازه دسترسی داده می‌شود
        console.error("Error checking access requirements:", {
          cultural: culturalData,
          correction: correctionData,
        });
        setAccessRestricted(false);
      }
    } catch (error) {
      console.error("Error checking access requirements:", error);
      // در صورت خطا، اجازه دسترسی داده می‌شود
      setAccessRestricted(false);
    } finally {
      setAccessCheckLoading(false);
    }
  }, []);

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
      label: "درخواست ناقص (منتظر تایید کاربر)",
      color: "bg-blue-500",
      icon: FaEye,
    },
    {
      value: "user_approval",
      label: "در انتظار بررسی مبدأ",
      color: "bg-yellow-500",
      icon: FaClock,
    },

    {
      value: "source_review",
      label: "درحال بررسی مشمولیت",
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
      label: "رد مشمولیت (فاقد شرایط)",
      color: "bg-red-500",
      icon: FaTimes,
    },
    {
      value: "source_approval",
      label: "موافقت مبدا (موقت/دائم)",
      color: "bg-green-600",
      icon: FaThumbsUp,
    },
    {
      value: "source_rejection",
      label: "مخالفت مبدا",
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

  // دریافت اطلاعات کمکی
  const fetchHelpers = async () => {
    try {
      const response = await fetch("/api/transfer-applicant-specs/helpers");
      const data = await response.json();

      if (data.success) {
        // استخراج مناطق منحصر به فرد با کد و نام
        const uniqueDistricts = (data.districts || [])
          .filter((d) => d.code && d.name)
          .reduce((acc, district) => {
            const exists = acc.find((item) => item.code === district.code);
            if (!exists) {
              acc.push({
                code: district.code,
                name: district.name,
              });
            }
            return acc;
          }, [])
          .sort((a, b) => a.code.localeCompare(b.code));

        setHelpers({
          employmentFields: data.employmentFields || [],
          genders: data.genders || [],
          districts: data.districts || [],
          districtCodes: uniqueDistricts,
        });
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
    }
  };

  // دریافت لیست درخواست‌های تجدید نظر
  const fetchAppealRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (employmentFieldFilter) {
        params.append("employmentField", employmentFieldFilter);
      }
      if (genderFilter) {
        params.append("gender", genderFilter);
      }
      if (districtCodeFilter) {
        params.append("districtCode", districtCodeFilter);
      }
      if (sortBy) {
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);
      }

      const url = `/api/document-review${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url, {
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
      setIsOpen(false);
      setLoading(false);
    }
  }, [
    employmentFieldFilter,
    genderFilter,
    districtCodeFilter,
    sortBy,
    sortOrder,
  ]);

  // دریافت اولیه داده‌ها
  useEffect(() => {
    if (user && !userLoading) {
      fetchHelpers();
      fetchAppealRequests();
    }
  }, [
    user,
    userLoading,
    employmentFieldFilter,
    genderFilter,
    sortBy,
    sortOrder,
    fetchAppealRequests,
  ]);

  // بررسی دسترسی برای کاربران districtTransferExpert
  useEffect(() => {
    if (user && !userLoading && user.role === "districtTransferExpert") {
      checkAccessRequirements();
    }
  }, [user, userLoading, checkAccessRequirements]);

  // دریافت داده‌های اولیه برای کاربران با دسترسی
  useEffect(() => {
    if (
      user &&
      ["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      fetchAppealRequests();
      fetchApprovalReasons();
    }
  }, [user, fetchAppealRequests]);

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
            console.log("data------->", data);

            let transferSpec = null;
            if (data.success && data.specs && Array.isArray(data.specs)) {
              // Debug: چاپ تمام nationalId های موجود

              transferSpec = data.specs.find(
                (spec) => String(spec.nationalId) === String(request.nationalId)
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
          جنسیت:
            request.gender === "male"
              ? "مرد"
              : request.gender === "female"
              ? "زن"
              : "-",
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

          // مقصد نهایی
          "مقصد نهایی": (() => {
            const finalDest = ts?.finalDestination;
            if (finalDest && typeof finalDest === "object") {
              return finalDest.districtCode || "-";
            }
            return "-";
          })(),
          "نوع انتقال نهایی": (() => {
            const finalDest = ts?.finalDestination;
            if (finalDest && typeof finalDest === "object") {
              return getTransferTypeText(finalDest.transferType);
            }
            return "-";
          })(),

          // اضافه کردن ستون‌های دلایل
          ...reasonsColumns,

          // بندهای تایید شده اداره
          "بندهای تایید شده اداره": (() => {
            const approvedReasons = request.selectedReasons?.filter(
              (sr) => sr.review?.status === "approved"
            );
            if (!approvedReasons || approvedReasons.length === 0) {
              return "-";
            }
            return approvedReasons
              .map((sr) => {
                const reason = sr.reasonId;
                return (
                  reason?.title ||
                  reason?.reasonTitle ||
                  `بند ${reason?.reasonCode || "نامشخص"}`
                );
              })
              .join(" | ");
          })(),

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

          // نظر اداره مبدا درباره نوع انتقال
          "نظر مبدا نوع انتقال":
            ts?.sourceOpinionTransferType === "permanent"
              ? "موافقت دائم"
              : ts?.sourceOpinionTransferType === "temporary"
              ? "موافقت موقت"
              : "-",

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
          "کد رای کمیسیون پزشکی": ts?.medicalCommissionCode || "-",
          "رای کمیسیون پزشکی": ts?.medicalCommissionVerdict || "-",
          "امتیاز تایید شده": ts?.approvedScore || "-",
          "ردیف در رشته/همجنس": (() => {
            // وضعیت‌هایی که مجاز به نمایش رتبه هستند
            const validStatuses = [
              "user_approval",
              "source_review",
              "exception_eligibility_approval",
              "source_approval",
            ];

            const hasValidStatus = validStatuses.includes(
              request.currentRequestStatus
            );

            if (!hasValidStatus) {
              return "فاقد شرایط";
            }

            if (request.rankInGroup && request.totalInGroup) {
              return `${request.rankInGroup} از ${request.totalInGroup}`;
            }

            return "در حال محاسبه";
          })(),
          "نوع گروه‌بندی": (() => {
            if (!request.groupKey) return "-";
            const isShared = !request.groupKey.includes("gender");
            if (isShared) {
              return "رشته مشترک";
            } else {
              const gender =
                request.gender === "male"
                  ? "مرد"
                  : request.gender === "female"
                  ? "زن"
                  : "نامشخص";
              return `${gender} - رشته ${request.fieldCode}`;
            }
          })(),
          "رشته استخدامی": ts?.employmentField || "-",
          "کد رشته": ts?.fieldCode || "-",
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

        // اولویت‌های مقصد (14 ستون) + مقصد نهایی (2 ستون)
        ...Array(7)
          .fill()
          .map(() => [{ wch: 15 }, { wch: 20 }])
          .flat(),
        { wch: 15 }, // مقصد نهایی
        { wch: 20 }, // نوع انتقال نهایی

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
        { wch: 20 }, // نظر مبدا نوع انتقال
        { wch: 15 }, // تصمیم منطقه
        { wch: 60 }, // نظر منطقه
        { wch: 80 }, // جزئیات بررسی دلایل
        { wch: 40 }, // نظرات کاربر
        { wch: 12 }, // سنوات
        { wch: 15 }, // نوع استخدام
        { wch: 15 }, // کد رای کمیسیون پزشکی
        { wch: 50 }, // رای کمیسیون پزشکی
        { wch: 15 }, // امتیاز تایید شده
        { wch: 20 }, // ردیف در رشته/همجنس
        { wch: 25 }, // نوع گروه‌بندی
        { wch: 25 }, // رشته استخدامی
        { wch: 12 }, // کد رشته
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

    const matchesEmploymentField =
      !employmentFieldFilter || request.fieldCode === employmentFieldFilter;

    const matchesGender = !genderFilter || request.gender === genderFilter;

    const matchesDistrictCode =
      !districtCodeFilter || request.districtCode === districtCodeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesEmploymentField &&
      matchesGender &&
      matchesDistrictCode
    );
  });

  // مرتب‌سازی درخواست‌ها
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortBy) return 0;

    if (sortBy === "approvedScore") {
      const scoreA = a.approvedScore || 0;
      const scoreB = b.approvedScore || 0;
      return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
    }

    return 0;
  });

  // محاسبات pagination
  const totalItems = sortedRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  // reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    employmentFieldFilter,
    genderFilter,
    districtCodeFilter,
    sortBy,
    sortOrder,
  ]);

  // تابع‌های pagination
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));

  // بررسی وضعیت بارگذاری احراز هویت
  if (userLoading || accessCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  // بررسی محدودیت دسترسی برای کاربران districtTransferExpert
  if (user?.role === "districtTransferExpert" && accessRestricted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
            <div className="text-center">
              <FaExclamationTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                محدودیت دسترسی
              </h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 whitespace-pre-line text-right">
                  {restrictionMessage}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() =>
                    (window.location.href =
                      "/dashboard/cultural-couple-requests")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  بررسی درخواست‌های زوج فرهنگی
                </button>
                <button
                  onClick={() =>
                    (window.location.href =
                      "/dashboard/district-correction-requests")
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  بررسی درخواست‌های اصلاح مشخصات
                </button>
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  بازگشت به داشبورد
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // تابع دریافت متن وضعیت بررسی
  const getReviewStatusDisplayText = (status) => {
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
        return "در انتظار تصمیم کاربر";
      case "user_approval":
        return "در انتظار بررسی";
      case "source_review":
        return "در حال بررسی مبدا";
      case "exception_eligibility_approval":
        return "تایید مشمولیت";
      case "exception_eligibility_rejection":
        return "رد مشمولیت";
      case "source_approval":
        return "موافقت مبدا";
      case "source_rejection":
        return "مخالفت مبدا";
      case "province_review":
        return "در حال بررسی توسط استان";
      case "province_approval":
        return "موافقت استان";
      case "province_rejection":
        return "مخالفت استان";
      case "destination_review":
        return "در حال بررسی توسط مقصد";
      case "destination_approval":
        return "موافقت مقصد";
      case "destination_rejection":
        return "مخالفت مقصد";
      default:
        return "نامشخص";
    }
  };

  // باز کردن مودال بررسی
  const openReviewModal = (request) => {
    setSelectedRequest(request);
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

  // ذخیره بررسی
  const handleSaveReview = async () => {
    if (
      user.role === "districtTransferExpert" ||
      user.role === "provinceTransferExpert" ||
      user.role === "systemAdmin"
    ) {
      toast.error("شما به این دکمه دسترسی ندارید");
      return;
    }
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
        // نمایش پیام مناسب بر اساس تصمیم‌گیری خودکار
        toast.success(data.message);
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

        // اگر تصمیم‌گیری خودکار انجام شده، مدال را ببندیم
        if (data.data?.autoDecision?.made) {
          setTimeout(() => {
            setShowReviewModal(false);
            setSelectedRequest(null);
            setReviewData({});
            setIsDataSaved(false);
          }, 2000); // 2 ثانیه تاخیر برای نمایش پیام
        }
      } else {
        console.error("API Error Details:", data);
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "خطا در ذخیره بررسی";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("خطا در ذخیره بررسی");
    } finally {
      setSubmitting(false);
    }
  };

  // دریافت آمار وضعیت کاربران هم‌رشته و هم‌جنس
  const fetchPersonnelStats = async (personnelCode, districtCode) => {
    try {
      setLoadingStats(true);
      const response = await fetch(
        `/api/personnel-stats?personnelCode=${personnelCode}&districtCode=${districtCode}`
      );
      const data = await response.json();
      console.log("data ====?", data);
      if (data.success) {
        setPersonnelStats(data.data);
      } else {
        console.error("خطا در دریافت آمار:", data.error);
        toast.error("خطا در دریافت آمار کاربران");
      }
    } catch (error) {
      console.error("Error fetching personnel stats:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoadingStats(false);
    }
  };

  // دریافت لیست پرسنل هم‌رشته و هم‌جنس
  const fetchPersonnelList = async (personnelCode, districtCode) => {
    try {
      setLoadingPersonnelList(true);
      const response = await fetch(
        `/api/personnel-list?personnelCode=${personnelCode}&districtCode=${districtCode}`
      );
      const data = await response.json();

      if (data.success) {
        setPersonnelList(data.data.personnelList);
        setShowPersonnelListModal(true);
      } else {
        console.error("خطا در دریافت لیست پرسنل:", data.error);
        toast.error("خطا در دریافت لیست پرسنل");
      }
    } catch (error) {
      console.error("Error fetching personnel list:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoadingPersonnelList(false);
    }
  };

  // دریافت دلایل انتخاب بندها
  const handleReasonSelection = async () => {
    if (sourceOpinionType === "approve" && selectedReasons.length > 0) {
      await fetchClauseConditions(selectedReasons, "approval");
    }
  };

  // دریافت شرایط بندها
  const fetchClauseConditions = async (selectedClauses, conditionType) => {
    try {
      setLoadingConditions(true);

      const response = await fetch("/api/clause-conditions/by-clauses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedClauses,
          conditionType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در دریافت شرایط بندها");
      }

      const data = await response.json();
      if (data.success) {
        setClauseConditions(data.data.conditions);
        setAcceptedConditions([]); // ریست کردن شرایط تایید شده
      } else {
        throw new Error(data.error || "خطا در دریافت شرایط بندها");
      }
    } catch (error) {
      console.error("❌ Error fetching clause conditions:", error);
      toast.error("خطا در دریافت شرایط بندها: " + error.message);
      setClauseConditions([]);
      setAcceptedConditions([]);
    } finally {
      setLoadingConditions(false);
    }
  };

  // باز کردن مدال نظر مبدا
  const openSourceOpinionModal = async (personnel, opinionType) => {
    setSelectedPersonnel(personnel);
    setSourceOpinionType(opinionType);
    setSelectedReasons([]);
    setSourceComment("");
    setPersonnelStats(null);
    setClauseConditions([]);
    setAcceptedConditions([]);
    setShowSourceOpinionModal(true);

    // دریافت آمار کاربران هم‌رشته و هم‌جنس
    if (personnel.personnelCode && personnel.districtCode) {
      await fetchPersonnelStats(
        personnel.personnelCode,
        personnel.districtCode
      );
    }

    // دریافت دلایل موافقت/مخالفت
    await fetchApprovalReasons();

    // برای موافقت، استخراج بندهای تایید شده از درخواست کاربر
    if (opinionType === "approve" && personnel.selectedReasons) {
      const approvedReasonIds = personnel.selectedReasons
        .filter((reason) => reason.review?.status === "approved")
        .map((reason) => reason.reasonId._id || reason.reasonId);

      if (approvedReasonIds.length > 0) {
        setSelectedReasons(approvedReasonIds);
        // دریافت شرایط مربوط به بندهای تایید شده
        await fetchClauseConditions(approvedReasonIds, "approval");
      }
    }

    // برای مخالفت، استخراج بندهای رد شده از درخواست کاربر
    if (opinionType === "reject" && personnel.selectedReasons) {
      const approvedReasonIds = personnel.selectedReasons
        .filter((reason) => reason.review?.status === "approved")
        .map((reason) => reason.reasonId._id || reason.reasonId);

      if (approvedReasonIds.length > 0) {
        setSelectedReasons(approvedReasonIds);
        // دریافت شرایط مربوط به بندهای رد شده
        await fetchClauseConditions(approvedReasonIds, "rejection");
      }
    }
  };

  // بستن مدال نظر مبدا
  const closeSourceOpinionModal = () => {
    setShowSourceOpinionModal(false);
    setSelectedPersonnel(null);
    setSourceOpinionType(null);
    setSelectedReasons([]);
    setSourceComment("");
    setPersonnelStats(null);
    setLoadingStats(false);
    setClauseConditions([]);
    setAcceptedConditions([]);
    setLoadingConditions(false);
    setSourceOpinionTransferType("");
  };

  // ثبت نظر مبدا (موافقت یا مخالفت)
  const handleSourceOpinion = async () => {
    if (selectedReasons.length === 0) {
      toast.error("لطفاً حداقل یک دلیل انتخاب کنید");
      return;
    }

    // بررسی اجباری بودن نوع انتقال برای موافقت
    if (sourceOpinionType === "approve" && !sourceOpinionTransferType) {
      toast.error("لطفاً نوع انتقال را مشخص کنید");
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
          sourceOpinionTransferType: sourceOpinionTransferType || null,
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
    return `بررسی مستندات تنها برای درخواست‌های با وضعیت "در انتظار بررسی"، "در حال بررسی مبدا"، "تایید مشمولیت" یا "رد مشمولیت (فاقد شرایط)" امکان‌پذیر است. وضعیت فعلی: ${currentStatusText}`;
  };

  // ترجمه وضعیت به فارسی
  const getStatusPersianText = (status) => {
    const statusMap = {
      // وضعیت‌های اولیه
      pending: "در انتظار بررسی",
      submitted: "ارسال شده",
      under_review: "در حال بررسی",

      // وضعیت‌های کاربر
      user_no_action: "فاقد درخواست تجدیدنظر",
      awaiting_user_approval: "درخواست ناقص (منتظر تایید کاربر)",
      user_approval: "در انتظار بررسی مبدأ",

      // وضعیت‌های بررسی مستندات
      source_review: "درحال بررسی مشمولیت",
      exception_eligibility_approval: "تایید مشمولیت",
      exception_eligibility_rejection: "رد مشمولیت (فاقد شرایط)",

      // وضعیت‌های نظر مبدا
      source_approval: "موافقت مبدا (موقت/دائم)",
      source_rejection: "مخالفت مبدا",

      // وضعیت‌های استان
      province_review: "در حال بررسی توسط استان",
      province_approval: "موافقت استان",
      province_rejection: "مخالفت استان",

      // وضعیت‌های مقصد
      // destination_review: "در حال بررسی مقصد",
      destination_approval: "موافقت مقصد",
      destination_rejection: "مخالفت مقصد",

      // وضعیت‌های نهایی
      final_approval: "موافقت نهایی",
      final_rejection: "مخالفت نهایی",
      completed: "تکمیل شده",
      cancelled: "لغو شده",
      archived: "بایگانی شده",
    };

    return statusMap[status] || status;
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-dvw mx-auto">
         {/* اطلاعیه مهم */}
      <ImportantNotice /> 
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
            <div className="space-y-4">
              {/* ردیف اول: جستجو و دکمه اکسل */}
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
                <div className="flex items-center text-sm text-gray-600 md:w-32">
                  <FaFilter className="h-4 w-4 ml-2" />
                  {filteredRequests.length} نتیجه
                </div>
              </div>

              {/* ردیف دوم: فیلترها */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* فیلتر وضعیت */}
                <div className="md:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وضعیت درخواست
                  </label>
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

                {/* فیلتر رشته استخدامی */}
                <div className="md:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رشته استخدامی
                  </label>
                  <select
                    value={employmentFieldFilter}
                    onChange={(e) => setEmploymentFieldFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">همه رشته‌ها</option>
                    {helpers.employmentFields
                      ?.sort((a, b) => a.fieldCode.localeCompare(b.fieldCode))
                      .map((field) => (
                        <option key={field.fieldCode} value={field.fieldCode}>
                          {field.displayName}
                        </option>
                      ))}
                  </select>
                </div>

                {/* فیلتر جنسیت */}
                <div className="md:w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    جنسیت
                  </label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">همه</option>
                    {helpers.genders?.map((gender) => (
                      <option key={gender.value} value={gender.value}>
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* فیلتر کد منطقه - فقط برای کاربران استان */}
                {user?.role === "provinceTransferExpert" && (
                  <div className="md:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد منطقه
                    </label>
                    <select
                      value={districtCodeFilter}
                      onChange={(e) => setDistrictCodeFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">همه مناطق</option>
                      {helpers.districtCodes?.map((district) => (
                        <option key={district.code} value={district.code}>
                          {district.code} - {district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* مرتب‌سازی براساس امتیاز */}
                <div className="md:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مرتب‌سازی امتیاز
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">بدون مرتب‌سازی</option>
                      <option value="approvedScore">امتیاز</option>
                    </select>
                    {sortBy && (
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="desc">↓</option>
                        <option value="asc">↑</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* دکمه پاک کردن فیلترها */}
                <div className="md:w-32 flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setEmploymentFieldFilter("");
                      setGenderFilter("");
                      setSortBy("");
                      setSortOrder("desc");
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="پاک کردن همه فیلترها"
                  >
                    <FaTimes className="h-3 w-3" />
                    پاک کردن
                  </button>
                </div>
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
                    {user?.role === "provinceTransferExpert" && (
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        کد منطقه
                      </th>
                    )}
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اطلاعات متقاضی
                    </th>
                    {/* <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      جنسیت
                    </th> */}
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رشته استخدامی
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      دلایل انتخابی
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت پرسنل
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ ها
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      امتیاز تایید شده
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رتبه در رشته/همجنس
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
                      {/* ستون کد منطقه - فقط برای کاربران استان - اولین ستون */}
                      {user?.role === "provinceTransferExpert" && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {request.districtCode || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getDistrictName(request.districtCode) ||
                              "نام منطقه نامشخص"}
                          </div>
                        </td>
                      )}

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

                      {/* ستون جنسیت */}
                      {/* <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.gender === "male"
                              ? "bg-blue-100 text-blue-800"
                              : request.gender === "female"
                              ? "bg-pink-100 text-pink-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {request.gender === "male"
                            ? "مرد"
                            : request.gender === "female"
                            ? "زن"
                            : "نامشخص"}
                        </span>
                      </td> */}

                      {/* ستون رشته استخدامی */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {request.fieldCode ? `${request.fieldCode}` : "-"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {request.employmentField || "-"}
                        </div>
                      </td>

                      {/* ستون دلایل انتخابی */}
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

                      {/* ستون وضعیت پرسنل + نظر مبدا نوع انتقال */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="space-y-2">
                          {/* وضعیت پرسنل */}
                          <div>
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
                          </div>

                          {/* نظر مبدا نوع انتقال */}
                          <div>
                            {request.sourceOpinionTransferType ? (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  request.sourceOpinionTransferType ===
                                  "permanent"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {request.sourceOpinionTransferType ===
                                "permanent"
                                  ? "انتقال دائم"
                                  : "انتقال موقت"}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                نظر مبدا: -
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ستون تاریخ‌ها */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        <div className="space-y-2">
                          {/* تاریخ درخواست */}
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              درخواست:
                            </div>
                            {/* <div className="text-xs">
                              {new Date(request.createdAt).toLocaleDateString(
                                "fa-IR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </div> */}
                            <div className="text-xs">
                              {new Date(request.createdAt).toLocaleDateString(
                                "fa-IR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>

                          {/* آخرین بروزرسانی */}
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              بروزرسانی:
                            </div>
                            {/* <div className="text-xs">
                              {new Date(
                                request.updatedAt || request.createdAt
                              ).toLocaleDateString("fa-IR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div> */}
                            <div className="text-xs">
                              {new Date(
                                request.updatedAt || request.createdAt
                              ).toLocaleDateString("fa-IR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* ستون امتیاز تایید شده */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {request.approvedScore !== null &&
                        request.approvedScore !== undefined ? (
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold text-blue-600">
                              {request.approvedScore}
                            </span>
                            <span className="text-xs text-gray-500">
                              امتیاز
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            <FaExclamationTriangle className="h-3 w-3" />
                            نامشخص
                          </span>
                        )}
                      </td>

                      {/* ستون رتبه در رشته/همجنس */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          // وضعیت‌هایی که مجاز به نمایش رتبه هستند
                          const validStatuses = [
                            "user_approval",
                            "source_review",
                            "exception_eligibility_approval",
                            "source_approval",
                          ];

                          // بررسی اینکه آیا وضعیت فعلی در لیست مجاز است
                          const hasValidStatus = validStatuses.includes(
                            request.currentRequestStatus
                          );

                          if (!hasValidStatus) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] wrap-text bg-red-100 text-red-700">
                                <FaExclamationTriangle className="h-3 w-3 wrap-anywhere" />
                                فاقد رتبه به دلیل نوع وضعیت{" "}
                              </span>
                            );
                          }

                          // اگر وضعیت معتبر است اما رتبه محاسبه نشده
                          if (
                            request.rankInGroup === null ||
                            request.rankInGroup === undefined ||
                            request.totalInGroup === null ||
                            request.totalInGroup === undefined
                          ) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                <FaSpinner className="h-3 w-3 animate-spin" />
                                در حال محاسبه
                              </span>
                            );
                          }

                          // نمایش رتبه
                          return (
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-bold text-green-600">
                                {request.rankInGroup}
                              </span>
                              <span className="text-xs text-gray-500">
                                از {request.totalInGroup}
                              </span>
                              <span className="text-xs text-gray-400 mt-1">
                                {(() => {
                                  // تعیین نوع گروه برای نمایش
                                  if (!request.groupKey) return "";

                                  const isShared =
                                    !request.groupKey.includes("gender");
                                  if (isShared) {
                                    return "رشته مشترک";
                                  } else {
                                    const gender =
                                      request.gender === "male"
                                        ? "مرد"
                                        : request.gender === "female"
                                        ? "زن"
                                        : "نامشخص";
                                    return `${gender} - رشته ${request.fieldCode}`;
                                  }
                                })()}
                              </span>
                            </div>
                          );
                        })()}
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
                            onClick={() => {
                              openReviewModal(request);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                          >
                            <FaEye className="h-3 w-3" />
                            بررسی وضعیت شمولیت
                          </button>

                          {request.currentRequestStatus ===
                            "exception_eligibility_approval" && (
                            <div className="flex gap-1 flex-col">
                              <button
                                onClick={() => {
                                  if (
                                    user.role === "districtTransferExpert" ||
                                    user.role === "provinceTransferExpert"
                                  ) {
                                    toast.error(
                                      "زمان ثبت درخواست به اتمام رسیده است."
                                    );
                                    return;
                                  }
                                  openSourceOpinionModal(request, "approve");
                                }}
                                disabled={
                                  !shouldShowSourceOpinionButtons(request)
                                }
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="ثبت موافقت با انتقال"
                              >
                                <FaThumbsUp className="h-3 w-3" />
                                ثبت موافقت با انتقال
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    user.role === "districtTransferExpert" ||
                                    user.role === "provinceTransferExpert"
                                  ) {
                                    toast.error(
                                      "زمان ثبت درخواست به اتمام رسیده است."
                                    );
                                    return;
                                  }
                                  openSourceOpinionModal(request, "reject");
                                }}
                                disabled={
                                  !shouldShowSourceOpinionButtons(request)
                                }
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="مخالفت با انتقال ثبت"
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
                        فرم بررسی و اظهارنظر وضعیت شمولیت بندهای انتخابی توسط
                        متقاضی
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
                {/* تذکر مهم */}
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full">
                        <span className="text-white text-sm font-bold">!</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-red-700 font-bold text-sm mb-2">
                        تذکر مهم:
                      </h5>
                      <p className="text-red-600 text-sm leading-relaxed">
                        همکار گرامی، از طریق این فرم، شما باید نسبت به بررسی
                        بندهایی که توسط متقاضی انتخاب شده، اقدام نموده و وضعیت
                        شمولیت یا عدم شمولیت وی را درخصوص هریک از بندهای
                        خوداظهاری شده مشخص نمائید.
                        <span className="font-semibold">
                          {" "}
                          دقت کنید تایید شمولیت بندها در این صفحه به معنی موافقت
                          با انتقال نیست
                        </span>{" "}
                        و ثبت نظر نهایی موافقت یا مخالفت با انتقال برای افراد
                        مشمول باید از طریق دکمه مربوطه در لیست اصلی انجام گردد.
                      </p>
                    </div>
                  </div>
                </div>
                {/* اطلاعات متقاضی */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaUser className="h-4 w-4 text-gray-600" />
                    اطلاعات متقاضی
                  </h4>

                  {/* اطلاعات اساسی */}
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">
                        نام و نام خانوادگی
                      </div>
                      <div className="font-medium text-gray-900">
                        {selectedRequest.fullName}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">کد ملی</div>
                      <div className="font-medium text-gray-900">
                        {selectedRequest.nationalId}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">کد پرسنلی</div>
                      <div className="font-medium text-gray-900">
                        {selectedRequest.personnelCode}
                      </div>
                    </div>
                  </div>

                  {/* ردیف دوم */}
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">رشته شغلی</div>
                      <div className="font-medium text-gray-900">
                        {selectedRequest?.employmentField || "نامشخص"}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">سنوات مؤثر</div>
                      <div className="font-medium text-gray-900">
                        {selectedRequest?.effectiveYears || "نامشخص"} سال
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">
                        امتیاز تایید شده
                      </div>
                      <div className="font-medium text-blue-600">
                        {selectedRequest?.approvedScore || "نامشخص"}
                      </div>
                    </div>
                  </div>

                  {/* ردیف سوم */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">
                        منطقه اصلی محل خدمت (مبدأ انتقال){" "}
                      </div>
                      <div className="font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">
                            {selectedRequest.currentWorkPlaceCode || "نامشخص"}
                          </span>
                          {selectedRequest.currentWorkPlaceCode && (
                            <span className="text-xs text-gray-600 mt-1">
                              {getDistrictName(
                                selectedRequest.currentWorkPlaceCode
                              ) || "نام منطقه نامشخص"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedRequest.phone && (
                      <div className="bg-white p-2 rounded border">
                        <div className="text-xs text-gray-500">شماره تماس</div>
                        <div className="font-medium text-gray-900">
                          {selectedRequest.phone}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* جدول اولویت‌های مقصد */}
                  {selectedRequest.destinationPriorities &&
                    selectedRequest.destinationPriorities.length > 0 && (
                      <div className="bg-white rounded border">
                        <div className="bg-blue-50 px-3 py-2 border-b">
                          <div className="text-sm font-medium text-blue-800 flex items-center gap-2">
                            <FaMapMarkerAlt className="h-3 w-3" />
                            اولویت‌های مقصد
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                {[1, 2, 3, 4, 5, 6, 7].map((priority) => (
                                  <th
                                    key={priority}
                                    className="px-2 py-1 text-center font-medium text-gray-700 border-l border-gray-200"
                                  >
                                    اولویت {priority}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {[1, 2, 3, 4, 5, 6, 7].map((priority) => {
                                  const destination =
                                    selectedRequest.destinationPriorities?.find(
                                      (dest) => dest.priority === priority
                                    );
                                  return (
                                    <td
                                      key={priority}
                                      className="px-2 py-1 text-center border-l border-gray-200 bg-white"
                                    >
                                      {destination ? (
                                        <div className="space-y-1">
                                          <div className="font-medium text-gray-900 text-xs">
                                            {destination.districtCode || "-"}
                                          </div>
                                          {destination.districtCode && (
                                            <div className="text-xs text-gray-600 font-medium">
                                              {getDistrictName(
                                                destination.districtCode
                                              ) || "نام منطقه نامشخص"}
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-500">
                                            {getTransferTypeText(
                                              destination.transferType
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400">-</div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-gray-800 flex-1">
                                    {reasonText}
                                  </h5>

                                  {/* دکمه راهنمای الزامات این بند */}
                                  {populatedReason && (
                                    <div className="relative group">
                                      <button
                                        type="button"
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors ml-2"
                                      >
                                        📋 الزامات
                                      </button>

                                      {/* Tooltip راهنما */}
                                      <div className="absolute top-0 left-full ml-2 w-80 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="font-medium mb-2 text-yellow-300">
                                          📋 الزامات این بند:
                                        </div>

                                        <div className="space-y-2">
                                          {/* نیاز به تایید کارشناس */}
                                          <div className="flex items-center gap-2">
                                            {populatedReason?.requiresAdminApproval ? (
                                              <>
                                                <div className="h-2 w-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-orange-300">
                                                  نیاز به بررسی کارشناس
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <div className="h-2 w-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-gray-300">
                                                  کارشناس بدون نیاز به تایید
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {/* نیاز به بارگذاری مدرک */}
                                          <div className="flex items-center gap-2">
                                            {populatedReason?.requiresDocumentUpload ? (
                                              <>
                                                <div className="h-2 w-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-purple-300">
                                                  نیاز به بارگذاری مدرک
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <div className="h-2 w-2 bg-teal-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-teal-300">
                                                  بدون نیاز به مدرک
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {/* نیاز به زوج فرهنگی */}
                                          <div className="flex items-center gap-2">
                                            {populatedReason?.isCulturalCouple ? (
                                              <>
                                                <div className="h-2 w-2 bg-pink-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-pink-300">
                                                  نیاز به اطلاعات زوج فرهنگی
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <div className="h-2 w-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                                                <span className="text-blue-300">
                                                  بدون نیاز به اطلاعات زوج
                                                  فرهنگی
                                                </span>
                                              </>
                                            )}
                                          </div>

                                          {/* بررسی سنوات */}
                                          {populatedReason?.yearsLimit && (
                                            <div className="flex items-start gap-2">
                                              {(selectedRequest?.effectiveYears ||
                                                0) <
                                              populatedReason.yearsLimit ? (
                                                <>
                                                  <div className="h-2 w-2 bg-red-400 rounded-full flex-shrink-0 mt-1"></div>
                                                  <span className="text-red-300">
                                                    هشدار: سنوات ناکافی (پرسنل:{" "}
                                                    {selectedRequest?.effectiveYears ||
                                                      0}{" "}
                                                    سال، مورد نیاز:{" "}
                                                    {populatedReason.yearsLimit}{" "}
                                                    سال)
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="h-2 w-2 bg-green-400 rounded-full flex-shrink-0 mt-1"></div>
                                                  <span className="text-green-300">
                                                    سنوات کافی (پرسنل:{" "}
                                                    {selectedRequest?.effectiveYears ||
                                                      0}{" "}
                                                    سال، مورد نیاز:{" "}
                                                    {populatedReason.yearsLimit}{" "}
                                                    سال)
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* فلش tooltip */}
                                        <div className="absolute top-4 -left-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-800"></div>
                                      </div>
                                    </div>
                                  )}
                                </div>

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

                          {/* باکس یکپارچه بررسی و اظهارنظر */}
                          <div className="mt-3">
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm">
                              {/* فیلد توضیحات کارشناس */}
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FaUser className="h-3 w-3 text-indigo-600" />
                                  <label className="text-sm font-medium text-indigo-700">
                                    توضیحات کارشناس (اختیاری):
                                  </label>
                                </div>
                                <textarea
                                  placeholder="نظر، توضیحات یا دلیل تصمیم خود را برای این دلیل وارد کنید..."
                                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80"
                                  rows={3}
                                  value={
                                    reviewData[`${reasonKey}_comment`] || ""
                                  }
                                  onChange={(e) =>
                                    setReviewData((prev) => ({
                                      ...prev,
                                      [`${reasonKey}_comment`]: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              {/* دکمه‌های تایید/رد */}
                              {populatedReason?.requiresAdminApproval && (
                                <div className="border-t border-indigo-200 pt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                    <p className="text-sm text-blue-800 font-semibold">
                                      وضعیت شمولیت این متقاضی را درخصوص این بند،
                                      مشخص کنید:
                                    </p>
                                  </div>

                                  {/* دکمه‌ها و اطلاعات بررسی */}
                                  <div className="space-y-3">
                                    <div className="flex gap-3 justify-end">
                                      <button
                                        onClick={() =>
                                          setReviewData((prev) => ({
                                            ...prev,
                                            [reasonKey]: "approved",
                                          }))
                                        }
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                          reviewData[reasonKey] === "approved"
                                            ? "bg-green-600 text-white shadow-lg shadow-green-200"
                                            : "bg-green-100 text-green-700 hover:bg-green-600 hover:text-white border border-green-300"
                                        }`}
                                      >
                                        <FaCheck className="h-4 w-4" />
                                        تایید
                                      </button>
                                      <button
                                        onClick={() =>
                                          setReviewData((prev) => ({
                                            ...prev,
                                            [reasonKey]: "rejected",
                                          }))
                                        }
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                          reviewData[reasonKey] === "rejected"
                                            ? "bg-red-600 text-white shadow-lg shadow-red-200"
                                            : "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white border border-red-300"
                                        }`}
                                      >
                                        <FaTimes className="h-4 w-4" />
                                        رد
                                      </button>
                                    </div>

                                    {/* نمایش اطلاعات بررسی موجود - در انتهای هر بند */}
                                    {((reviewData[reasonKey] &&
                                      reviewData[reasonKey] !== "pending") ||
                                      (reason.review &&
                                        reason.review.reviewedBy)) && (
                                      <div className="bg-white/50 rounded-md p-3 border border-indigo-300/30 space-y-2">
                                        {/* وضعیت بررسی */}
                                        {reviewData[reasonKey] &&
                                          reviewData[reasonKey] !==
                                            "pending" && (
                                            <div className="text-xs">
                                              <span className="text-indigo-600 font-medium">
                                                🔍 وضعیت بررسی:{" "}
                                              </span>
                                              <span
                                                className={`font-bold ${
                                                  reviewData[reasonKey] ===
                                                  "approved"
                                                    ? "text-green-700"
                                                    : "text-red-700"
                                                }`}
                                              >
                                                {reviewData[reasonKey] ===
                                                "approved"
                                                  ? "تایید شده"
                                                  : "رد شده"}
                                              </span>
                                            </div>
                                          )}

                                        {/* بررسی قبلی توسط کارشناس */}
                                        {reason.review &&
                                          reason.review.reviewedBy && (
                                            <div className="text-xs text-gray-600">
                                              <span className="text-indigo-600 font-medium">
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
                                                  ? "کارشناس منطقه"
                                                  : "کارشناس استان"}
                                              </span>
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
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
                          ? "تغییرات ذخیره شده و تصمیم‌گیری خودکار انجام شد"
                          : "ذخیره تغییرات و تصمیم‌گیری خودکار مشمولیت"
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
                          {isDataSaved
                            ? "ذخیره شده ✓"
                            : " ذخیره (ثبت وضعیت شمولیت)"}
                        </>
                      )}
                    </button>
                  </div>

                  {/* نمایش وضعیت تصمیم‌گیری خودکار مشمولیت */}
                  {canPerformDocumentReview(selectedRequest) && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        وضعیت بررسی شمولیت:
                      </h4>
                      {(() => {
                        // محاسبه وضعیت بندها
                        const reasonsRequiringApproval =
                          selectedRequest.selectedReasons.filter(
                            (reason) =>
                              reason?.reasonId?.requiresAdminApproval === true
                          );

                        const reviewedReasons = reasonsRequiringApproval.filter(
                          (reason) =>
                            reason.review?.status &&
                            reason.review.status !== "pending"
                        );

                        const pendingReasons = reasonsRequiringApproval.filter(
                          (reason) =>
                            !reason.review?.status ||
                            reason.review.status === "pending"
                        );

                        const approvedReasons = reviewedReasons.filter(
                          (reason) => reason.review?.status === "approved"
                        );

                        const rejectedReasons = reviewedReasons.filter(
                          (reason) => reason.review?.status === "rejected"
                        );

                        // تعیین وضعیت و پیام
                        let statusInfo = null;

                        if (reasonsRequiringApproval.length === 0) {
                          statusInfo = {
                            type: "info",
                            icon: <FaInfoCircle className="h-5 w-5" />,
                            title: "بدون نیاز به بررسی",
                            message:
                              "این درخواست شامل بندهایی که نیاز به تایید کارشناس دارند نمی‌باشد",
                            bgColor: "bg-gray-50",
                            borderColor: "border-gray-200",
                            textColor: "text-gray-700",
                            titleColor: "text-gray-800",
                          };
                        } else if (pendingReasons.length > 0) {
                          statusInfo = {
                            type: "pending",
                            icon: <FaClock className="h-5 w-5" />,
                            title: "در حال بررسی",
                            message: `${pendingReasons.length} بند در انتظار تکمیل بررسی - ${reviewedReasons.length} بند بررسی شده`,
                            bgColor: "bg-yellow-50",
                            borderColor: "border-yellow-200",
                            textColor: "text-yellow-700",
                            titleColor: "text-yellow-800",
                          };
                        } else if (approvedReasons.length > 0) {
                          statusInfo = {
                            type: "approved",
                            icon: <FaCheck className="h-5 w-5" />,
                            title: "✅ تایید مشمولیت استثنا",
                            message: `${approvedReasons.length} بند تایید شده از ${reasonsRequiringApproval.length} بند - وضعیت کاربر به‌روزرسانی شد`,
                            bgColor: "bg-green-50",
                            borderColor: "border-green-200",
                            textColor: "text-green-700",
                            titleColor: "text-green-800",
                          };
                        } else if (
                          rejectedReasons.length ===
                            reasonsRequiringApproval.length &&
                          reasonsRequiringApproval.length > 0
                        ) {
                          statusInfo = {
                            type: "rejected",
                            icon: <FaTimes className="h-5 w-5" />,
                            title: "❌ رد مشمولیت استثنا",
                            message: `همه ${rejectedReasons.length} بند رد شده - وضعیت کاربر به‌روزرسانی شد`,
                            bgColor: "bg-red-50",
                            borderColor: "border-red-200",
                            textColor: "text-red-700",
                            titleColor: "text-red-800",
                          };
                        }

                        if (!statusInfo) return null;

                        return (
                          <div
                            className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`${statusInfo.titleColor} mt-0.5`}
                              >
                                {statusInfo.icon}
                              </div>
                              <div className="flex-1">
                                <h4
                                  className={`text-sm font-medium ${statusInfo.titleColor} mb-1`}
                                >
                                  {statusInfo.title}
                                </h4>
                                <p
                                  className={`text-xs ${statusInfo.textColor}`}
                                >
                                  {statusInfo.message}
                                </p>

                                {/* نمایش جزئیات بیشتر برای حالت در حال بررسی */}
                                {statusInfo.type === "pending" && (
                                  <div className="mt-2 space-y-1">
                                    {approvedReasons.length > 0 && (
                                      <div className="text-xs text-green-600">
                                        ✅ {approvedReasons.length} بند تایید
                                        شده
                                      </div>
                                    )}
                                    {rejectedReasons.length > 0 && (
                                      <div className="text-xs text-red-600">
                                        ❌ {rejectedReasons.length} بند رد شده
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
                          ? "ثبت موافقت با انتقال"
                          : "ثبت مخالفت با انتقال"}
                      </h3>
                      <p className="text-sm opacity-90">
                        {sourceOpinionType === "approve"
                          ? `فرم ثبت نظر کمیته توسعه مدیریت اداره مبنی بر موافقت با انتقال متقاضی ${selectedPersonnel.fullName}`
                          : `فرم ثبت نظر کمیته توسعه مدیریت اداره مبنی بر مخالفت با انتقال متقاضی ${selectedPersonnel.fullName}`}
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
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaUser className="h-4 w-4 text-gray-600" />
                    اطلاعات پرسنل
                  </h4>

                  {/* اطلاعات اساسی */}
                  <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">
                        نام و نام خانوادگی
                      </div>
                      <div className="font-medium text-gray-900">
                        {selectedPersonnel.fullName}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">کد ملی</div>
                      <div className="font-medium text-gray-900">
                        {selectedPersonnel.nationalId}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">کد پرسنلی</div>
                      <div className="font-medium text-gray-900">
                        {selectedPersonnel.personnelCode}
                      </div>
                    </div>
                  </div>

                  {/* اطلاعات تکمیلی */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">وضعیت درخواست</div>
                      <div className="font-medium text-gray-900">
                        {getStatusPersianText(
                          selectedPersonnel.currentRequestStatus
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500">
                        منطقه اصلی محل خدمت (مبدأ انتقال){" "}
                      </div>
                      <div className="font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">
                            {selectedPersonnel.currentWorkPlaceCode || "نامشخص"}
                          </span>
                          {selectedPersonnel.currentWorkPlaceCode && (
                            <span className="text-xs text-gray-600 mt-1">
                              {getDistrictName(
                                selectedPersonnel.currentWorkPlaceCode
                              ) || "نام منطقه نامشخص"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* جدول اولویت‌های مقصد */}
                  {selectedPersonnel.destinationPriorities &&
                    selectedPersonnel.destinationPriorities.length > 0 && (
                      <div className="bg-white rounded border">
                        <div className="bg-blue-50 px-3 py-2 border-b">
                          <div className="text-sm font-medium text-blue-800 flex items-center gap-2">
                            <FaMapMarkerAlt className="h-3 w-3" />
                            اولویت‌های مقصد
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                {[1, 2, 3, 4, 5, 6, 7].map((priority) => (
                                  <th
                                    key={priority}
                                    className="px-2 py-1 text-center font-medium text-gray-700 border-l border-gray-200"
                                  >
                                    اولویت {priority}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {[1, 2, 3, 4, 5, 6, 7].map((priority) => {
                                  const destination =
                                    selectedPersonnel.destinationPriorities?.find(
                                      (dest) => dest.priority === priority
                                    );
                                  return (
                                    <td
                                      key={priority}
                                      className="px-2 py-1 text-center border-l border-gray-200 bg-white"
                                    >
                                      {destination ? (
                                        <div className="space-y-1">
                                          <div className="font-medium text-gray-900 text-xs">
                                            {destination.districtCode || "-"}
                                          </div>
                                          {destination.districtCode && (
                                            <div className="text-xs text-gray-600 font-medium">
                                              {getDistrictName(
                                                destination.districtCode
                                              ) || "نام منطقه نامشخص"}
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-500">
                                            {getTransferTypeText(
                                              destination.transferType
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400">-</div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>

                {/* آمار وضعیت کاربران هم‌رشته و هم‌جنس */}
                {loadingStats ? (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-700">
                        در حال بارگیری آمار کاربران...
                      </span>
                    </div>
                  </div>
                ) : personnelStats ? (
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-medium text-indigo-800 mb-3 flex items-center gap-2">
                      <FaUser className="h-4 w-4" />
                      وضعیت پرسنل هم‌رشته و هم‌جنس در منطقه
                    </h4>

                    {/* جدول آمار وضعیت‌ها */}
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-xs border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-indigo-100 to-indigo-200">
                            <th className="border-r border-indigo-300 px-3 py-2 text-indigo-800 font-medium">
                              <div className="flex items-center justify-center gap-1">
                                <FaUser className="h-3 w-3" />
                                در انتظار بررسی
                              </div>
                            </th>
                            <th className="border-r border-indigo-300 px-3 py-2 text-indigo-800 font-medium">
                              <div className="flex items-center justify-center gap-1">
                                <FaClock className="h-3 w-3" />
                                در حال بررسی مبدا
                              </div>
                            </th>
                            <th className="border-r border-indigo-300 px-3 py-2 text-indigo-800 font-medium">
                              <div className="flex items-center justify-center gap-1">
                                <FaCheck className="h-3 w-3" />
                                تایید مشمولیت
                              </div>
                            </th>
                            <th className="px-3 py-2 text-indigo-800 font-medium">
                              <div className="flex items-center justify-center gap-1">
                                <FaThumbsUp className="h-3 w-3" />
                                موافقت مبدا
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white hover:bg-indigo-25">
                            <td className="border-r border-indigo-200 px-3 py-3 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold">
                                {personnelStats.statusStats.user_approval}
                              </div>
                            </td>
                            <td className="border-r border-indigo-200 px-3 py-3 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full font-bold">
                                {personnelStats.statusStats.source_review}
                              </div>
                            </td>
                            <td className="border-r border-indigo-200 px-3 py-3 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full font-bold">
                                {
                                  personnelStats.statusStats
                                    .exception_eligibility_approval
                                }
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                                {personnelStats.statusStats.source_approval}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* اطلاعات رتبه‌بندی */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-2 rounded border border-indigo-200">
                        <div className="text-indigo-600 font-medium">
                          رشته تحصیلی:
                        </div>
                        <div className="font-bold text-indigo-800">
                          {personnelStats.fieldCode} -{" "}
                          {personnelStats.employmentField}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border border-indigo-200">
                        <div className="text-indigo-600 font-medium">
                          جنسیت:
                        </div>
                        <div className="font-bold text-indigo-800">
                          {personnelStats.gender === "male" ? "آقا" : "خانم"}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border border-indigo-200">
                        <div className="text-indigo-600 font-medium">
                          کل هم‌گروه:
                        </div>
                        <div className="font-bold text-indigo-800">
                          {personnelStats.totalSimilarPersonnel} نفر
                        </div>
                      </div>
                      {personnelStats.ranking.rank && (
                        <div className="bg-white p-2 rounded border border-indigo-200">
                          <div className="text-indigo-600 font-medium">
                            رتبه در گروه:
                          </div>
                          <div className="font-bold text-indigo-800">
                            {personnelStats.ranking.rank} از{" "}
                            {personnelStats.ranking.totalPersonnel}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* نمره تایید شده */}
                    {personnelStats.ranking.approvedScore && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="text-xs text-green-700 flex items-center gap-2">
                          <FaCheck className="h-3 w-3" />
                          <span className="font-medium">امتیاز تایید شده:</span>
                          <span className="font-bold text-green-800">
                            {personnelStats.ranking.approvedScore}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* دکمه مشاهده لیست پرسنل */}
                    <div className="mt-4 pt-3 border-t border-indigo-200">
                      <button
                        onClick={() =>
                          fetchPersonnelList(
                            selectedPersonnel.personnelCode,
                            selectedPersonnel.currentWorkPlaceCode
                          )
                        }
                        disabled={loadingPersonnelList}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <FaList className="h-4 w-4" />
                        {loadingPersonnelList
                          ? "در حال بارگذاری..."
                          : "نمایش لیست متقاضیان تجدیدنظر در این گروه رشته/جنسیت"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* بندهای تایید شده کاربر و شرایط مربوطه */}
                {sourceOpinionType === "approve" ? (
                  <>
                    {/* بندهای تایید شده و شرایط مربوطه */}
                    {selectedPersonnel.selectedReasons && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          بندهای مشمول و شرایط مربوطه:
                          {clauseConditions.length > 0 && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>

                        {loadingConditions ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="mr-2 text-gray-600">
                              در حال بارگذاری شرایط...
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            {selectedPersonnel.selectedReasons
                              .filter(
                                (reason) => reason.review?.status === "approved"
                              )
                              .map((reason) => {
                                const reasonId =
                                  reason.reasonId._id || reason.reasonId;
                                const relatedConditions =
                                  clauseConditions.filter((condition) =>
                                    condition.relatedClauses.some(
                                      (rc) =>
                                        (rc.clauseId._id || rc.clauseId) ===
                                        reasonId
                                    )
                                  );

                                return (
                                  <div
                                    key={reasonId}
                                    className="bg-white rounded-lg border border-green-100 p-3"
                                  >
                                    {/* عنوان بند */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                          {reason.reasonId?.title ||
                                            reason.reasonTitle ||
                                            reason.title}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {reason.reasonTitle || reason.title}
                                        </div>
                                      </div>
                                    </div>

                                    {/* شرایط این بند */}
                                    {relatedConditions.length > 0 ? (
                                      <div className="space-y-2 mr-5">
                                        <div className="text-sm font-medium text-gray-700">
                                          شرایط این بند:
                                        </div>
                                        {relatedConditions.map((condition) => (
                                          <label
                                            key={condition._id}
                                            className="flex items-start gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded cursor-pointer border-2 border-yellow-200 shadow-sm"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={acceptedConditions.includes(
                                                condition._id
                                              )}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setAcceptedConditions(
                                                    (prev) => [
                                                      ...prev,
                                                      condition._id,
                                                    ]
                                                  );
                                                } else {
                                                  setAcceptedConditions(
                                                    (prev) =>
                                                      prev.filter(
                                                        (id) =>
                                                          id !== condition._id
                                                      )
                                                  );
                                                }
                                              }}
                                              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                            />
                                            <div className="flex-1">
                                              <div className="font-bold text-red-800 text-sm">
                                                {condition.title}
                                              </div>
                                              {condition.description && (
                                                <div className="text-xs text-red-700 mt-1 font-medium">
                                                  {condition.description}
                                                </div>
                                              )}
                                              {/* <div className="flex items-center gap-2 mt-1">
                                                <span
                                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    condition.importanceLevel ===
                                                    "critical"
                                                      ? "bg-red-100 text-red-800"
                                                      : condition.importanceLevel ===
                                                        "high"
                                                      ? "bg-orange-100 text-orange-800"
                                                      : condition.importanceLevel ===
                                                        "medium"
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-gray-100 text-gray-800"
                                                  }`}
                                                >
                                                  {condition.importanceLevel ===
                                                    "critical" && "حیاتی"}
                                                  {condition.importanceLevel ===
                                                    "high" && "مهم"}
                                                  {condition.importanceLevel ===
                                                    "medium" && "متوسط"}
                                                  {condition.importanceLevel ===
                                                    "low" && "کم"}
                                                </span>
                                              </div> */}
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 mr-5 italic">
                                        هیچ شرط خاصی برای این بند تعریف نشده است
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                            {selectedPersonnel.selectedReasons.filter(
                              (reason) => reason.review?.status === "approved"
                            ).length === 0 && (
                              <div className="text-center py-6 text-gray-500">
                                هیچ بند تایید شده‌ای برای این کاربر وجود ندارد
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* بندهای رد شده کاربر و شرایط مربوطه */
                  <>
                    {/* بندهای رد شده و شرایط مربوطه */}
                    {selectedPersonnel.selectedReasons && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          بندهای مشمول و شرایط مربوطه:
                          {clauseConditions.length > 0 && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>

                        {loadingConditions ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="mr-2 text-gray-600">
                              در حال بارگذاری شرایط...
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            {selectedPersonnel.selectedReasons
                              .filter(
                                (reason) => reason.review?.status === "approved"
                              )
                              .map((reason) => {
                                const reasonId =
                                  reason.reasonId._id || reason.reasonId;
                                const relatedConditions =
                                  clauseConditions.filter((condition) =>
                                    condition.relatedClauses.some(
                                      (rc) =>
                                        (rc.clauseId._id || rc.clauseId) ===
                                        reasonId
                                    )
                                  );

                                return (
                                  <div
                                    key={reasonId}
                                    className="bg-white rounded-lg border border-red-100 p-3"
                                  >
                                    {/* عنوان بند */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                          {reason.reasonId?.title ||
                                            reason.reasonTitle ||
                                            reason.title}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {reason.reasonTitle || reason.title}
                                        </div>
                                      </div>
                                    </div>

                                    {/* شرایط این بند */}
                                    {relatedConditions.length > 0 ? (
                                      <div className="space-y-2 mr-5">
                                        <div className="text-sm font-medium text-gray-700">
                                          شرایط این بند:
                                        </div>
                                        {relatedConditions.map((condition) => (
                                          <label
                                            key={condition._id}
                                            className="flex items-start gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded cursor-pointer border-2 border-yellow-200 shadow-sm"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={acceptedConditions.includes(
                                                condition._id
                                              )}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setAcceptedConditions(
                                                    (prev) => [
                                                      ...prev,
                                                      condition._id,
                                                    ]
                                                  );
                                                } else {
                                                  setAcceptedConditions(
                                                    (prev) =>
                                                      prev.filter(
                                                        (id) =>
                                                          id !== condition._id
                                                      )
                                                  );
                                                }
                                              }}
                                              className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                            />
                                            <div className="flex-1">
                                              <div className="font-bold text-red-800 text-sm">
                                                {condition.title}
                                              </div>
                                              {condition.description && (
                                                <div className="text-xs text-red-700 mt-1 font-medium">
                                                  {condition.description}
                                                </div>
                                              )}
                                              {/* <div className="flex items-center gap-2 mt-1">
                                                <span
                                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    condition.importanceLevel ===
                                                    "critical"
                                                      ? "bg-red-100 text-red-800"
                                                      : condition.importanceLevel ===
                                                        "high"
                                                      ? "bg-orange-100 text-orange-800"
                                                      : condition.importanceLevel ===
                                                        "medium"
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-gray-100 text-gray-800"
                                                  }`}
                                                >
                                                  {condition.importanceLevel ===
                                                    "critical" && "حیاتی"}
                                                  {condition.importanceLevel ===
                                                    "high" && "مهم"}
                                                  {condition.importanceLevel ===
                                                    "medium" && "متوسط"}
                                                  {condition.importanceLevel ===
                                                    "low" && "کم"}
                                                </span>
                                              </div> */}
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 mr-5 italic">
                                        هیچ شرط خاصی برای این بند تعریف نشده است
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                            {selectedPersonnel.selectedReasons.filter(
                              (reason) => reason.review?.status === "rejected"
                            ).length === 0 && (
                              <div className="text-center py-6 text-gray-500">
                                هیچ بند رد شده‌ای برای این کاربر وجود ندارد
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* نظر اداره مبدا درباره نوع انتقال - فقط برای موافقت */}
                {sourceOpinionType === "approve" && (
                  <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <label className="text-sm font-medium text-blue-800">
                        نظر اداره مبدا درباره نوع انتقال:
                        <span className="text-red-500 text-xs ml-1">*</span>
                      </label>
                      <div className="flex gap-6">
                        <label
                          className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border-2 transition-all ${
                            sourceOpinionTransferType === "permanent"
                              ? "bg-green-100 border-green-300 text-green-800 font-medium"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="sourceOpinionTransferType"
                            value="permanent"
                            checked={sourceOpinionTransferType === "permanent"}
                            onChange={(e) =>
                              setSourceOpinionTransferType(e.target.value)
                            }
                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium">
                            انتقال دائم
                          </span>
                        </label>
                        <label
                          className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border-2 transition-all ${
                            sourceOpinionTransferType === "temporary"
                              ? "bg-orange-100 border-orange-300 text-orange-800 font-medium"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="sourceOpinionTransferType"
                            value="temporary"
                            checked={sourceOpinionTransferType === "temporary"}
                            onChange={(e) =>
                              setSourceOpinionTransferType(e.target.value)
                            }
                            className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium">
                            انتقال موقت
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

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
                    disabled={
                      submitting ||
                      (sourceOpinionType === "approve"
                        ? !sourceOpinionTransferType ||
                          (clauseConditions.length > 0 &&
                            acceptedConditions.length !==
                              clauseConditions.length)
                        : clauseConditions.length > 0 &&
                          acceptedConditions.length !== clauseConditions.length)
                    }
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

        {/* مدال لیست پرسنل هم‌رشته */}
        {showPersonnelListModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaList className="h-5 w-5 text-indigo-600" />
                    لیست متقاضیان هم رشته/جنسیت متقاضی تجدیدنظر - به ترتیب نزولی
                    امتیاز
                    {personnelStats?.isSharedField && (
                      <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                        (رشته مشترک)
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowPersonnelListModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="h-6 w-6" />
                  </button>
                </div>

                {/* جدول لیست پرسنل */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ردیف
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نام
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نام خانوادگی
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          کد پرسنلی
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          وضعیت درخواست
                        </th>
                        <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          امتیاز تایید شده
                        </th>
                        {personnelStats?.isSharedField && (
                          <th className="px-6 py-3 border-b border-gray-200 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            جنسیت
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-right">
                      {personnelList.map((person, index) => {
                        const isCurrentUser =
                          person.personnelCode ===
                          selectedPersonnel.personnelCode;
                        return (
                          <tr
                            key={person.personnelCode}
                            className={`${
                              isCurrentUser
                                ? "bg-blue-50 hover:bg-blue-100 border-r-4 border-blue-500"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                {person.firstName}
                                {isCurrentUser && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                    کاربر فعلی
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {person.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {person.personnelCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  person.currentRequestStatus ===
                                  "user_approval"
                                    ? "bg-blue-100 text-blue-800"
                                    : person.currentRequestStatus ===
                                      "source_review"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : person.currentRequestStatus ===
                                      "exception_eligibility_approval"
                                    ? "bg-purple-100 text-purple-800"
                                    : person.currentRequestStatus ===
                                      "source_approval"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {getStatusText(person.currentRequestStatus)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-bold text-indigo-600">
                                {person.approvedScore || "نامشخص"}
                              </span>
                            </td>
                            {personnelStats?.isSharedField && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {person.gender === "male" ? "مرد" : "زن"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {personnelList.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    هیچ پرسنلی در این گروه یافت نشد
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    تعداد کل: {personnelList.length} نفر
                  </div>
                  <button
                    onClick={() => setShowPersonnelListModal(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    بستن
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
