"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  FaUsers,
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaIdCard,
  FaCheck,
  FaTimes,
  FaEye,
  FaSpinner,
  FaSearch,
  FaFilter,
  FaFileAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFileExcel,
  FaDownload,
} from "react-icons/fa";
import * as XLSX from "xlsx";

export default function CulturalCoupleRequestsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    opinion: "",
    description: "",
    decision: "", // 'approve' or 'reject'
  });
  const [submitting, setSubmitting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // دریافت لیست درخواست‌های زوج فرهنگی
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cultural-couple-requests", {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
      } else {
        toast.error(data.error || "خطا در دریافت درخواست‌ها");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("خطا در دریافت درخواست‌ها");
    } finally {
      setLoading(false);
    }
  };

  // تابع دریافت خروجی اکسل
  const handleExportToExcel = async () => {
    try {
      setExportingExcel(true);

      // آماده‌سازی داده‌ها برای اکسل
      const excelData = filteredRequests.map((request, index) => ({
        ردیف: index + 1,
        "نام متقاضی": request.fullName || "-",
        "کد ملی متقاضی": request.nationalId || "-",
        "کد پرسنلی متقاضی": request.personnelCode || "-",
        "شماره تماس متقاضی": request.phone || "-",
        "نام همسر": request.culturalCoupleInfo?.spouseFullName || "-",
        "کد پرسنلی همسر": request.culturalCoupleInfo?.personnelCode || "-",
        "کد منطقه همسر": request.culturalCoupleInfo?.districtCode || "-",
        "نام منطقه همسر": request.culturalCoupleInfo?.districtName || "-",
        "نظر منطقه همسر":
          request.culturalCoupleInfo?.spouseDistrictOpinion || "-",
        "توضیحات منطقه همسر":
          request.culturalCoupleInfo?.spouseDistrictDescription || "-",
        "تصمیم منطقه همسر":
          request.culturalCoupleInfo?.spouseDistrictDecision === "approve"
            ? "تایید"
            : request.culturalCoupleInfo?.spouseDistrictDecision === "reject"
            ? "رد"
            : "-",
        "وضعیت بررسی": request.culturalCoupleInfo?.spouseDistrictDecision
          ? "بررسی شده"
          : "در انتظار بررسی",
        "تاریخ ایجاد": request.createdAt
          ? new Date(request.createdAt).toLocaleDateString("fa-IR")
          : "-",
        "سال تحصیلی": request.academicYear || "-",
      }));

      // ایجاد workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // تنظیم عرض ستون‌ها
      const columnWidths = [
        { wch: 8 }, // ردیف
        { wch: 25 }, // نام متقاضی
        { wch: 15 }, // کد ملی متقاضی
        { wch: 15 }, // کد پرسنلی متقاضی
        { wch: 15 }, // شماره تماس متقاضی
        { wch: 25 }, // نام همسر
        { wch: 15 }, // کد پرسنلی همسر
        { wch: 12 }, // کد منطقه همسر
        { wch: 20 }, // نام منطقه همسر
        { wch: 30 }, // نظر منطقه همسر
        { wch: 40 }, // توضیحات منطقه همسر
        { wch: 15 }, // تصمیم منطقه همسر
        { wch: 15 }, // وضعیت بررسی
        { wch: 15 }, // تاریخ ایجاد
        { wch: 12 }, // سال تحصیلی
      ];
      ws["!cols"] = columnWidths;

      // اضافه کردن worksheet به workbook
      XLSX.utils.book_append_sheet(wb, ws, "درخواست‌های زوج فرهنگی");

      // تولید نام فایل با تاریخ
      const currentDate = new Date()
        .toLocaleDateString("fa-IR")
        .replace(/\//g, "-");
      const fileName = `درخواست‌های-زوج-فرهنگی-${currentDate}.xlsx`;

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

  // ارسال نظر کارشناس
  const handleSubmitReview = async () => {
    if (!reviewForm.decision) {
      toast.error("لطفاً تصمیم خود را انتخاب کنید");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/cultural-couple-requests/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requestId: selectedRequest._id,
          opinion: reviewForm.opinion,
          description: reviewForm.description,
          decision: reviewForm.decision,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("نظر شما با موفقیت ثبت شد");
        setShowModal(false);
        setSelectedRequest(null);
        setReviewForm({
          opinion: "",
          description: "",
          decision: "",
        });
        fetchRequests(); // بروزرسانی لیست
      } else {
        toast.error(data.error || "خطا در ثبت نظر");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("خطا در ثبت نظر");
    } finally {
      setSubmitting(false);
    }
  };

  // فیلتر کردن درخواست‌ها
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.nationalId.includes(searchTerm) ||
      request.personnelCode?.includes(searchTerm) ||
      request.culturalCoupleInfo?.personnelCode?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" &&
        !request.culturalCoupleInfo?.spouseDistrictDecision) ||
      (statusFilter === "reviewed" &&
        request.culturalCoupleInfo?.spouseDistrictDecision);

    return matchesSearch && matchesStatus;
  });

  // تابع تعیین رنگ وضعیت
  const getStatusColor = (request) => {
    if (!request.culturalCoupleInfo?.spouseDistrictDecision) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (request.culturalCoupleInfo.spouseDistrictDecision === "approve") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-red-100 text-red-800 border-red-200";
  };

  // تابع تعیین متن وضعیت
  const getStatusText = (request) => {
    if (!request.culturalCoupleInfo?.spouseDistrictDecision) {
      return "در انتظار بررسی";
    }
    if (request.culturalCoupleInfo.spouseDistrictDecision === "approve") {
      return "تایید شده";
    }
    return "رد شده";
  };

  // تابع تعیین آیکون وضعیت
  const getStatusIcon = (request) => {
    if (!request.culturalCoupleInfo?.spouseDistrictDecision) {
      return <FaClock className="h-4 w-4" />;
    }
    if (request.culturalCoupleInfo.spouseDistrictDecision === "approve") {
      return <FaCheckCircle className="h-4 w-4" />;
    }
    return <FaTimesCircle className="h-4 w-4" />;
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  // بررسی دسترسی
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (
    !user ||
    (user.role !== "districtTransferExpert" &&
      user.role !== "provinceTransferExpert")
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">عدم دسترسی</h1>
          <p className="text-gray-600">شما به این صفحه دسترسی ندارید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaUsers className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">درخواست‌های زوج فرهنگی</h1>
                <p className="text-pink-100 text-sm">
                  {user.role === "districtTransferExpert"
                    ? "مدیریت درخواست‌های زوج فرهنگی منطقه شما"
                    : "مدیریت درخواست‌های زوج فرهنگی استان"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* فیلترها و جستجو */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* جستجو */}
            <div className="relative">
              <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="جستجو در نام، کد ملی، کد پرسنلی..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* فیلتر وضعیت */}
            <div className="relative">
              <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار بررسی</option>
                <option value="reviewed">بررسی شده</option>
              </select>
            </div>

            {/* دکمه دریافت اکسل */}
            <div>
              <button
                onClick={handleExportToExcel}
                disabled={exportingExcel || filteredRequests.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                title="دریافت خروجی اکسل"
              >
                {exportingExcel ? (
                  <>
                    <FaSpinner className="h-4 w-4 animate-spin" />
                    در حال تولید...
                  </>
                ) : (
                  <>
                    <FaFileExcel className="h-4 w-4" />
                    دریافت اکسل
                  </>
                )}
              </button>
            </div>

            {/* آمار */}
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">
                {filteredRequests.length} درخواست از {requests.length}
              </span>
            </div>
          </div>
        </div>

        {/* لیست درخواست‌ها */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
              <span className="text-gray-600">در حال بارگذاری...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FaFileAlt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                درخواستی یافت نشد
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "فیلترهای خود را تغییر دهید"
                  : "هنوز درخواست زوج فرهنگی‌ای ثبت نشده است"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      متقاضی
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      همسر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      منطقه همسر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      وضعیت بررسی
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      تاریخ درخواست
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-right">
                  {filteredRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <FaUser className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              کد ملی: {request.nationalId}
                            </div>
                            {request.personnelCode && (
                              <div className="text-sm text-gray-500">
                                کد پرسنلی: {request.personnelCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          کد پرسنلی:{" "}
                          {request.culturalCoupleInfo?.personnelCode ||
                            "نامشخص"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="h-4 w-4 text-gray-400 ml-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {request.culturalCoupleInfo?.districtName ||
                                "نامشخص"}
                            </div>
                            <div className="text-sm text-gray-500">
                              کد:{" "}
                              {request.culturalCoupleInfo?.districtCode ||
                                "نامشخص"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            request
                          )}`}
                        >
                          {getStatusIcon(request)}
                          {getStatusText(request)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString(
                          "fa-IR"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                              // پر کردن فرم با اطلاعات موجود
                              if (
                                request.culturalCoupleInfo
                                  ?.spouseDistrictDecision
                              ) {
                                setReviewForm({
                                  opinion:
                                    request.culturalCoupleInfo
                                      .spouseDistrictOpinion || "",
                                  description:
                                    request.culturalCoupleInfo
                                      .spouseDistrictDescription || "",
                                  decision:
                                    request.culturalCoupleInfo
                                      .spouseDistrictDecision,
                                });
                              } else {
                                setReviewForm({
                                  opinion: "",
                                  description: "",
                                  decision: "",
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <FaEye className="h-3 w-3" />
                            {request.culturalCoupleInfo?.spouseDistrictDecision
                              ? "مشاهده/ویرایش"
                              : "بررسی"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* مودال بررسی درخواست */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6">
              <h2 className="text-xl font-bold text-white">
                بررسی درخواست زوج فرهنگی
              </h2>
            </div>

            <div className="p-6">
              {/* اطلاعات متقاضی */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">
                  اطلاعات متقاضی:
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">نام کامل:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">کد ملی:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.nationalId}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">شماره تماس:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.phone}
                    </span>
                  </div>
                  {selectedRequest.personnelCode && (
                    <div>
                      <span className="text-gray-600">کد پرسنلی:</span>
                      <span className="font-medium mr-2">
                        {selectedRequest.personnelCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* اطلاعات همسر */}
              <div className="bg-pink-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">
                  اطلاعات همسر:
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">کد پرسنلی همسر:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.culturalCoupleInfo?.personnelCode ||
                        "نامشخص"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">منطقه خدمت همسر:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.culturalCoupleInfo?.districtName ||
                        "نامشخص"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">کد منطقه:</span>
                    <span className="font-medium mr-2">
                      {selectedRequest.culturalCoupleInfo?.districtCode ||
                        "نامشخص"}
                    </span>
                  </div>
                </div>
              </div>

              {/* فرم بررسی */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">نظر شما:</h3>

                {/* تصمیم */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تصمیم <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="decision"
                        value="approve"
                        checked={reviewForm.decision === "approve"}
                        onChange={(e) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            decision: e.target.value,
                          }))
                        }
                        className="ml-2"
                      />
                      <FaCheck className="h-4 w-4 text-green-600 ml-1" />
                      <span className="text-green-700">تایید درخواست</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="decision"
                        value="reject"
                        checked={reviewForm.decision === "reject"}
                        onChange={(e) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            decision: e.target.value,
                          }))
                        }
                        className="ml-2"
                      />
                      <FaTimes className="h-4 w-4 text-red-600 ml-1" />
                      <span className="text-red-700">رد درخواست</span>
                    </label>
                  </div>
                </div>

                {/* نظر */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نظر منطقه خدمت{" "}
                    <span className="text-gray-400 text-xs">(اختیاری)</span>
                  </label>
                  <input
                    type="text"
                    value={reviewForm.opinion}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        opinion: e.target.value,
                      }))
                    }
                    placeholder="نظر خود را در مورد این درخواست وارد کنید"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>

                {/* توضیحات */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات تکمیلی{" "}
                    <span className="text-gray-400 text-xs">(اختیاری)</span>
                  </label>
                  <textarea
                    value={reviewForm.description}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="توضیحات اضافی (اختیاری)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                  />
                </div>
              </div>

              {/* دکمه‌ها */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin h-4 w-4" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <FaCheck className="h-4 w-4" />
                      ثبت نظر
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setReviewForm({
                      opinion: "",
                      description: "",
                      decision: "",
                    });
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
