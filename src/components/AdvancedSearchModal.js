"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  FaSearch,
  FaTimes,
  FaUser,
  FaIdCard,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaFileAlt,
  FaTrophy,
  FaHistory,
  FaSpinner,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
} from "react-icons/fa";

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  userRole,
  initialSearchData,
}) {
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState(null);
  const [searchForm, setSearchForm] = useState({
    nationalId: "",
    personnelCode: "",
  });
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    appealRequests: false,
    profileCorrections: false,
    ranking: false,
    statusHistory: false,
  });
  const [selectedStatuses, setSelectedStatuses] = useState([
    "user_approval",
    "source_review",
    "exception_eligibility_approval",
    "source_approval",
    "source_rejection",
    "exception_eligibility_rejection",
    "province_review",
    "province_approval",
    "province_rejection",
    "destination_review",
    "destination_approval",
    "destination_rejection",
  ]);
  const [rankingNeedsUpdate, setRankingNeedsUpdate] = useState(false);

  // Effect برای پر کردن خودکار فرم و انجام جستجو
  useEffect(() => {
    if (initialSearchData && isOpen) {
      setSearchForm({
        nationalId: initialSearchData.nationalId || "",
        personnelCode: initialSearchData.personnelCode || "",
      });

      // انجام خودکار جستجو پس از پر کردن فرم
      if (initialSearchData.nationalId || initialSearchData.personnelCode) {
        handleAutoSearch(initialSearchData);
      }
    }
  }, [initialSearchData, isOpen]);

  if (!isOpen) return null;

  const handleAutoSearch = async (searchData) => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchData.nationalId)
        params.append("nationalId", searchData.nationalId);
      if (searchData.personnelCode)
        params.append("personnelCode", searchData.personnelCode);
      if (selectedStatuses.length > 0)
        params.append("statuses", selectedStatuses.join(","));

      const response = await fetch(
        `/api/transfer-applicant-specs/advanced-search?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setSearchData(data.data);
        setRankingNeedsUpdate(false);
        toast.success("جستجو با موفقیت انجام شد");
      } else {
        toast.error(data.error || "خطا در انجام جستجو");
        setSearchData(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("خطا در انجام جستجو");
      setSearchData(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchForm.nationalId && !searchForm.personnelCode) {
      toast.error("لطفاً حداقل یکی از کد ملی یا کد پرسنلی را وارد کنید");
      return;
    }

    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchForm.nationalId)
        params.append("nationalId", searchForm.nationalId);
      if (searchForm.personnelCode)
        params.append("personnelCode", searchForm.personnelCode);
      if (selectedStatuses.length > 0)
        params.append("statuses", selectedStatuses.join(","));

      const response = await fetch(
        `/api/transfer-applicant-specs/advanced-search?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setSearchData(data.data);
        setRankingNeedsUpdate(false);
        toast.success("جستجو با موفقیت انجام شد");
      } else {
        toast.error(data.error || "خطا در انجام جستجو");
        setSearchData(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("خطا در انجام جستجو");
      setSearchData(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
      destination_review: "در حال بررسی مقصد",
      destination_approval: "تایید مقصد",
      destination_rejection: "رد مقصد",
      pending: "در انتظار",
      approved: "تایید شده",
      rejected: "رد شده",
    };
    return statusMap[status] || status || "نامشخص";
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "نامشخص";
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resetSearch = () => {
    setSearchForm({ nationalId: "", personnelCode: "" });
    setSearchData(null);
    setExpandedSections({
      basicInfo: true,
      appealRequests: false,
      profileCorrections: false,
      ranking: false,
      statusHistory: false,
    });
  };

  // تابع برای تغییر وضعیت چک باکس‌ها
  const handleStatusChange = (status, checked) => {
    if (checked) {
      setSelectedStatuses((prev) => [...prev, status]);
    } else {
      setSelectedStatuses((prev) => prev.filter((s) => s !== status));
    }
    setRankingNeedsUpdate(true);
  };

  // تابع برای انتخاب/لغو انتخاب همه وضعیت‌ها
  const handleSelectAllStatuses = (selectAll) => {
    if (selectAll) {
      setSelectedStatuses([
        "user_approval",
        "source_review",
        "exception_eligibility_approval",
        "source_approval",
        "source_rejection",
        "exception_eligibility_rejection",
        "province_review",
        "province_approval",
        "province_rejection",
        "destination_review",
        "destination_approval",
        "destination_rejection",
      ]);
    } else {
      setSelectedStatuses([]);
    }
    setRankingNeedsUpdate(true);
  };

  // لیست تمام وضعیت‌های موجود
  const allStatuses = [
    { key: "user_approval", label: "در انتظار بررسی" },
    { key: "source_review", label: "در حال بررسی مبدا" },
    { key: "exception_eligibility_approval", label: "تایید مشمولیت" },
    {
      key: "exception_eligibility_rejection",
      label: "رد مشمولیت (فاقد شرایط)",
    },
    { key: "source_approval", label: "موافقت مبدا (موقت/دائم)" },
    { key: "source_rejection", label: "مخالفت مبدا" },
    { key: "province_review", label: "در حال بررسی توسط استان" },
    { key: "province_approval", label: "موافقت استان" },
    { key: "province_rejection", label: "مخالفت استان" },
    { key: "destination_review", label: "در حال بررسی مقصد" },
    { key: "destination_approval", label: "تایید مقصد" },
    { key: "destination_rejection", label: "رد مقصد" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaSearch className="text-2xl" />
            <h2 className="text-2xl font-bold">جستجوی پیشرفته پرسنل</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Search Form */}
          <div className="p-6 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد ملی
                </label>
                <input
                  type="text"
                  value={searchForm.nationalId}
                  onChange={(e) =>
                    setSearchForm((prev) => ({
                      ...prev,
                      nationalId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="کد ملی را وارد کنید"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد پرسنلی
                </label>
                <input
                  type="text"
                  value={searchForm.personnelCode}
                  onChange={(e) =>
                    setSearchForm((prev) => ({
                      ...prev,
                      personnelCode: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="کد پرسنلی را وارد کنید"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {searchLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      در حال جستجو...
                    </>
                  ) : (
                    <>
                      <FaSearch />
                      جستجو
                    </>
                  )}
                </button>
                <button
                  onClick={resetSearch}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  پاک کردن
                </button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchData && searchData.transferSpec && (
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection("basicInfo")}
                  className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FaUser className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      اطلاعات اصلی پرسنل
                    </h3>
                  </div>
                  {expandedSections.basicInfo ? (
                    <FaChevronUp />
                  ) : (
                    <FaChevronDown />
                  )}
                </button>

                {expandedSections.basicInfo && (
                  <div className="px-4 pb-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          نام و نام خانوادگی
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.firstName || ""}{" "}
                          {searchData.transferSpec.lastName || ""}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          کد پرسنلی
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.personnelCode || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">کد ملی</label>
                        <p className="font-semibold">
                          {searchData.transferSpec.nationalId || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">جنسیت</label>
                        <p className="font-semibold">
                          {searchData.transferSpec.gender === "male"
                            ? "مرد"
                            : "زن"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          شماره همراه
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.mobile || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          سنوات موثر
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.effectiveYears || 0} سال
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          رشته شغلی
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.employmentField || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">کد رشته</label>
                        <p className="font-semibold">
                          {searchData.transferSpec.fieldCode || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          امتیاز تایید شده
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.approvedScore || "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          منطقه خدمت
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.districtInfo?.name ||
                            "نامشخص"}{" "}
                          (
                          {searchData.transferSpec.districtInfo?.code ||
                            "نامشخص"}
                          )
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          وضعیت فعلی
                        </label>
                        <p className="font-semibold">
                          {getStatusText(
                            searchData.transferSpec.currentRequestStatus
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          کد وضعیت درخواست
                        </label>
                        <p className="font-semibold text-xs">
                          {searchData.transferSpec.currentRequestStatus}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          نوع استخدام
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.employmentType === "official"
                            ? "رسمی"
                            : searchData.transferSpec.employmentType ===
                              "contractual"
                            ? "پیمانی"
                            : searchData.transferSpec.employmentType ===
                              "contract"
                            ? "قراردادی"
                            : searchData.transferSpec.employmentType}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          محل خدمت فعلی
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.currentWorkPlaceCode?.name ||
                            "نامشخص"}
                          {searchData.transferSpec.currentWorkPlaceCode
                            ?.province?.name && (
                            <span className="text-xs text-gray-500 block">
                              استان{" "}
                              {
                                searchData.transferSpec.currentWorkPlaceCode
                                  .province.name
                              }
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          تاریخ ایجاد
                        </label>
                        <p className="font-semibold text-sm">
                          {formatDateTime(searchData.transferSpec.createdAt)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          آخرین بروزرسانی
                        </label>
                        <p className="font-semibold text-sm">
                          {formatDateTime(searchData.transferSpec.updatedAt)}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          کاربر سازنده
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.createdBy?.fullName ||
                            (searchData.transferSpec.createdBy?.firstName &&
                            searchData.transferSpec.createdBy?.lastName
                              ? searchData.transferSpec.createdBy.firstName +
                                " " +
                                searchData.transferSpec.createdBy.lastName
                              : null) ||
                            "نامشخص"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm text-gray-600">
                          رای کمیسیون پزشکی
                        </label>
                        <p className="font-semibold">
                          {searchData.transferSpec.medicalCommissionVerdict || "ثبت نشده"}
                        </p>
                        {searchData.transferSpec.medicalCommissionCode && (
                          <p className="text-xs text-gray-500 mt-1">
                            کد: {searchData.transferSpec.medicalCommissionCode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* اولویت‌های مقصد */}
                    <div className="mt-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-blue-600" />
                        اولویت‌های مقصد
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((priority) => {
                          const destinationKey = `destinationPriority${priority}`;
                          const destination =
                            searchData.transferSpec[destinationKey];

                          if (!destination || !destination.districtCode)
                            return null;

                          return (
                            <div
                              key={priority}
                              className="bg-blue-50 p-3 rounded-lg border border-blue-200"
                            >
                              <label className="text-sm text-blue-800 font-medium">
                                اولویت {priority}
                              </label>
                              <p className="font-semibold text-gray-800">
                                {destination.districtName ||
                                  destination.districtCode}
                              </p>
                              <p className="text-xs text-gray-600">
                                کد: {destination.districtCode}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                نوع:{" "}
                                {destination.transferType === "permanent"
                                  ? "دائم"
                                  : destination.transferType === "temporary"
                                  ? "موقت"
                                  : destination.transferType || "نامشخص"}
                              </p>
                            </div>
                          );
                        })}

                        {/* مقصد نهایی */}
                        {searchData.transferSpec.finalDestination &&
                          searchData.transferSpec.finalDestination
                            .districtCode && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <label className="text-sm text-green-800 font-medium">
                                مقصد نهایی
                              </label>
                              <p className="font-semibold text-gray-800">
                                {searchData.transferSpec.finalDestination
                                  .districtName ||
                                  searchData.transferSpec.finalDestination
                                    .districtCode}
                              </p>
                              <p className="text-xs text-gray-600">
                                کد:{" "}
                                {
                                  searchData.transferSpec.finalDestination
                                    .districtCode
                                }
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                نوع:{" "}
                                {searchData.transferSpec.finalDestination
                                  .transferType === "permanent"
                                  ? "دائم"
                                  : searchData.transferSpec.finalDestination
                                      .transferType === "temporary"
                                  ? "موقت"
                                  : searchData.transferSpec.finalDestination
                                      .transferType || "نامشخص"}
                              </p>
                            </div>
                          )}
                      </div>

                      {/* نمایش پیام در صورت عدم وجود اولویت */}
                      {![1, 2, 3, 4, 5, 6, 7].some((priority) => {
                        const destinationKey = `destinationPriority${priority}`;
                        return searchData.transferSpec[destinationKey]
                          ?.districtCode;
                      }) &&
                        !searchData.transferSpec.finalDestination
                          ?.districtCode && (
                          <div className="text-center py-4 text-gray-500">
                            <FaInfoCircle className="mx-auto text-2xl mb-2" />
                            <p>هیچ اولویت مقصدی تعریف نشده است</p>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ranking Information */}
              {searchData.rankingInfo && searchData.transferSpec && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => toggleSection("ranking")}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FaTrophy className="text-yellow-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        رتبه در رشته - هم جنس منطقه
                      </h3>
                    </div>
                    {expandedSections.ranking ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>

                  {expandedSections.ranking && (
                    <div className="px-4 pb-4 border-t">
                      {/* انتخاب وضعیت‌ها */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-blue-800">
                            انتخاب وضعیت‌ها برای محاسبه رتبه:
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSelectAllStatuses(true)}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              انتخاب همه
                            </button>
                            <button
                              onClick={() => handleSelectAllStatuses(false)}
                              className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                            >
                              لغو همه
                            </button>
                            <button
                              onClick={handleSearch}
                              disabled={
                                selectedStatuses.length === 0 || searchLoading
                              }
                              className={`text-xs px-3 py-1 rounded disabled:opacity-50 ${
                                rankingNeedsUpdate
                                  ? "bg-orange-600 hover:bg-orange-700 text-white animate-pulse"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              {searchLoading
                                ? "در حال محاسبه..."
                                : rankingNeedsUpdate
                                ? "🔄 محاسبه مجدد (تغییر یافته)"
                                : "محاسبه مجدد"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {allStatuses.map((status) => (
                            <label
                              key={status.key}
                              className="flex items-center space-x-2 space-x-reverse text-xs cursor-pointer hover:bg-blue-100 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedStatuses.includes(status.key)}
                                onChange={(e) =>
                                  handleStatusChange(
                                    status.key,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-blue-700">
                                {status.label}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="mt-2 text-xs text-blue-600">
                          انتخاب شده: <strong>{selectedStatuses.length}</strong>{" "}
                          از <strong>{allStatuses.length}</strong> وضعیت
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <label className="text-sm text-yellow-800">
                            رتبه کلی
                          </label>
                          <p className="font-bold text-2xl text-yellow-600">
                            {searchData.rankingInfo.rank}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <label className="text-sm text-blue-800">
                            کل واجدین شرایط
                          </label>
                          <p className="font-bold text-2xl text-blue-600">
                            {searchData.rankingInfo.totalEligible}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <label className="text-sm text-green-800">
                            امتیاز
                          </label>
                          <p className="font-bold text-2xl text-green-600">
                            {searchData.rankingInfo.approvedScore}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <label className="text-sm text-purple-800">
                            نوع رشته
                          </label>
                          <p className="font-semibold text-purple-600">
                            {searchData.rankingInfo.isShared
                              ? "مشترک"
                              : "تفکیکی"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-3">
                          رتبه <strong>{searchData.rankingInfo.rank}</strong> از{" "}
                          <strong>
                            {searchData.rankingInfo.totalEligible}
                          </strong>
                          نفر در رشته{" "}
                          <strong>{searchData.rankingInfo.fieldTitle}</strong>
                          {!searchData.rankingInfo.isShared &&
                            ` (${
                              searchData.rankingInfo.gender === "male"
                                ? "مردان"
                                : "زنان"
                            })`}
                          در منطقه{" "}
                          <strong>{searchData.rankingInfo.districtName}</strong>
                        </p>
                      </div>

                      {/* رتبه‌بندی برحسب وضعیت‌های انتخاب شده */}
                      {searchData.rankingInfo.statusBreakdown && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            رتبه‌بندی برحسب وضعیت‌های انتخاب شده (
                            {selectedStatuses.length} وضعیت):
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(
                              searchData.rankingInfo.statusBreakdown
                            )
                              .filter(([status]) =>
                                selectedStatuses.includes(status)
                              )
                              .map(([status, data]) => (
                                <div
                                  key={status}
                                  className={`p-3 rounded-lg border text-sm ${
                                    data.isCurrentUserStatus
                                      ? "bg-green-50 border-green-300"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-xs">
                                      {getStatusText(status)}
                                    </span>
                                    {data.isCurrentUserStatus && (
                                      <span className="text-green-600 text-xs">
                                        ⬅ وضعیت فعلی
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-blue-600">
                                      {data.rank}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      از {data.total} نفر
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Appeal Requests */}
              {searchData.appealRequests && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => toggleSection("appealRequests")}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FaFileAlt className="text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        درخواست‌های تجدید نظر (
                        {searchData.summary.totalAppealRequests})
                      </h3>
                    </div>
                    {expandedSections.appealRequests ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>

                  {expandedSections.appealRequests && (
                    <div className="px-4 pb-4 border-t">
                      {searchData.appealRequests.length > 0 ? (
                        <div className="space-y-4 mt-4">
                          {searchData.appealRequests.map((request, index) => (
                            <div
                              key={request._id}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-600">
                                  درخواست #{index + 1}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    request.status === "submitted"
                                      ? "bg-blue-100 text-blue-800"
                                      : request.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : request.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {request.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    تاریخ ایجاد:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {formatDateTime(request.createdAt)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    آخرین بروزرسانی:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {formatDateTime(request.updatedAt)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    کاربر ایجادکننده:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {request.userId?.fullName ||
                                      (request.userId?.firstName &&
                                      request.userId?.lastName
                                        ? request.userId.firstName +
                                          " " +
                                          request.userId.lastName
                                        : null) ||
                                      "نامشخص"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    تاریخ عضویت کاربر:
                                  </span>
                                  <span className="mr-2 font-medium text-xs">
                                    {request.userId?.createdAt
                                      ? formatDateTime(request.userId.createdAt)
                                      : "نامشخص"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    سال تحصیلی:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {request.academicYear}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    وضعیت بررسی:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {request.overallReviewStatus}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    تعداد دلایل:
                                  </span>
                                  <span className="mr-2 font-medium">
                                    {request.selectedReasons?.length || 0}
                                  </span>
                                </div>
                              </div>

                              {request.selectedReasons &&
                                request.selectedReasons.length > 0 && (
                                  <div className="mt-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                      دلایل انتخاب شده:
                                    </h4>
                                    <div className="space-y-3">
                                      {request.selectedReasons.map(
                                        (reason, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-gray-50 p-3 rounded border"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium text-sm">
                                                {reason.reasonTitle}
                                              </span>
                                              <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                  reason.review?.status ===
                                                  "approved"
                                                    ? "bg-green-100 text-green-800"
                                                    : reason.review?.status ===
                                                      "rejected"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}
                                              >
                                                {reason.review?.status ===
                                                "approved"
                                                  ? "تایید شده"
                                                  : reason.review?.status ===
                                                    "rejected"
                                                  ? "رد شده"
                                                  : "در انتظار"}
                                              </span>
                                            </div>

                                            {reason.reasonCode && (
                                              <div className="text-xs text-gray-600 mb-1">
                                                کد دلیل: {reason.reasonCode}
                                              </div>
                                            )}

                                            {/* نظر کارشناس منطقه */}
                                            {reason.review?.expertComment && (
                                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                                <div className="text-xs font-medium text-blue-800 mb-1">
                                                  نظر کارشناس منطقه:
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                  {reason.review.expertComment}
                                                </div>
                                                {reason.review.reviewedAt && (
                                                  <div className="text-xs text-blue-600 mt-1">
                                                    تاریخ بررسی:{" "}
                                                    {formatDate(
                                                      reason.review.reviewedAt
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* اطلاعات بیشتر بررسی */}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                              {reason.review?.reviewerRole && (
                                                <span>
                                                  نقش بررسی‌کننده:{" "}
                                                  {reason.review
                                                    .reviewerRole ===
                                                  "districtTransferExpert"
                                                    ? "کارشناس منطقه"
                                                    : reason.review
                                                        .reviewerRole ===
                                                      "provinceTransferExpert"
                                                    ? "کارشناس استان"
                                                    : reason.review
                                                        .reviewerRole}
                                                </span>
                                              )}
                                              {reason.review
                                                ?.reviewerLocationCode && (
                                                <span>
                                                  کد محل بررسی:{" "}
                                                  {
                                                    reason.review
                                                      .reviewerLocationCode
                                                  }
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaInfoCircle className="mx-auto text-4xl mb-3" />
                          <p>هیچ درخواست تجدید نظری یافت نشد</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profile Correction Requests */}
              {searchData.profileCorrectionRequests && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => toggleSection("profileCorrections")}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FaEdit className="text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        درخواست‌های اصلاح مشخصات (
                        {searchData.summary.totalProfileCorrections})
                      </h3>
                    </div>
                    {expandedSections.profileCorrections ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>

                  {expandedSections.profileCorrections && (
                    <div className="px-4 pb-4 border-t">
                      {searchData.profileCorrectionRequests.length > 0 ? (
                        <div className="space-y-4 mt-4">
                          {searchData.profileCorrectionRequests.map(
                            (request, index) => (
                              <div
                                key={request._id}
                                className="border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm text-gray-600">
                                    درخواست #{index + 1}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      request.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : request.status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {request.status || "در انتظار"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600">
                                      تاریخ ایجاد:
                                    </span>
                                    <span className="mr-2 font-medium">
                                      {formatDateTime(request.createdAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      آخرین بروزرسانی:
                                    </span>
                                    <span className="mr-2 font-medium">
                                      {formatDateTime(request.updatedAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      درخواست کننده:
                                    </span>
                                    <span className="mr-2 font-medium">
                                      {request.requestedBy?.fullName ||
                                        (request.requestedBy?.firstName &&
                                        request.requestedBy?.lastName
                                          ? request.requestedBy.firstName +
                                            " " +
                                            request.requestedBy.lastName
                                          : null) ||
                                        "نامشخص"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      تاریخ عضویت درخواست کننده:
                                    </span>
                                    <span className="mr-2 font-medium text-xs">
                                      {request.requestedBy?.createdAt
                                        ? formatDateTime(
                                            request.requestedBy.createdAt
                                          )
                                        : "نامشخص"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      نوع درخواست:
                                    </span>
                                    <span className="mr-2 font-medium">
                                      {request.requestType}
                                    </span>
                                  </div>
                                  {request.respondedBy && (
                                    <div>
                                      <span className="text-gray-600">
                                        پاسخ دهنده:
                                      </span>
                                      <span className="mr-2 font-medium">
                                        {request.respondedBy.firstName}{" "}
                                        {request.respondedBy.lastName}
                                      </span>
                                    </div>
                                  )}
                                  {request.responseDate && (
                                    <div>
                                      <span className="text-gray-600">
                                        تاریخ پاسخ:
                                      </span>
                                      <span className="mr-2 font-medium">
                                        {formatDateTime(request.responseDate)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {request.description && (
                                  <div className="mt-3">
                                    <span className="text-gray-600 text-sm">
                                      توضیحات:
                                    </span>
                                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                                      {request.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaInfoCircle className="mx-auto text-4xl mb-3" />
                          <p>هیچ درخواست اصلاح مشخصاتی یافت نشد</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status History */}
              {searchData.statusHistory && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => toggleSection("statusHistory")}
                    className="w-full p-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FaHistory className="text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        تاریخچه تغییرات وضعیت (
                        {searchData.summary.totalStatusChanges})
                      </h3>
                    </div>
                    {expandedSections.statusHistory ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>

                  {expandedSections.statusHistory && (
                    <div className="px-4 pb-4 border-t">
                      {searchData.statusHistory.allChanges.length > 0 ? (
                        <div className="space-y-3 mt-4">
                          {searchData.statusHistory.allChanges
                            .slice(0, 10)
                            .map((change, index) => (
                              <div
                                key={index}
                                className="border-r-4 border-blue-500 bg-gray-50 p-3 rounded"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {change.type === "workflow"
                                        ? "گردش کار"
                                        : "لاگ وضعیت"}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {change.fromStatus
                                        ? `${getStatusText(
                                            change.fromStatus
                                          )} → `
                                        : ""}
                                      {getStatusText(change.toStatus)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(change.date)}
                                  </span>
                                </div>

                                {change.comment && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    {change.comment}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>نوع عمل: {change.actionType}</span>
                                  {change.performedBy && (
                                    <span>
                                      انجام دهنده: {change.performedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}

                          {searchData.statusHistory.allChanges.length > 10 && (
                            <div className="text-center py-2">
                              <span className="text-sm text-gray-500">
                                و{" "}
                                {searchData.statusHistory.allChanges.length -
                                  10}{" "}
                                تغییر دیگر...
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaInfoCircle className="mx-auto text-4xl mb-3" />
                          <p>هیچ تاریخچه تغییر وضعیتی یافت نشد</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {searchData.summary && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaInfoCircle className="text-blue-600" />
                    خلاصه اطلاعات
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {searchData.summary.totalAppealRequests}
                      </div>
                      <div className="text-xs text-gray-600">
                        درخواست تجدید نظر
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {searchData.summary.totalProfileCorrections}
                      </div>
                      <div className="text-xs text-gray-600">درخواست اصلاح</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {searchData.summary.totalStatusChanges}
                      </div>
                      <div className="text-xs text-gray-600">تغییر وضعیت</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm font-bold text-green-600">
                        {getStatusText(searchData.summary.currentStatus)}
                      </div>
                      <div className="text-xs text-gray-600">وضعیت فعلی</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {searchLoading === false &&
            !searchData &&
            (searchForm.nationalId || searchForm.personnelCode) && (
              <div className="text-center py-12 text-gray-500">
                <FaInfoCircle className="mx-auto text-6xl mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  نتیجه‌ای یافت نشد
                </h3>
                <p>لطفاً اطلاعات را بررسی کرده و مجدداً تلاش کنید</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
