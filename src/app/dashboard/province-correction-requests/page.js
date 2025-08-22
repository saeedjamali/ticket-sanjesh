"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import { getFieldDisplayName } from "@/lib/fieldTranslations";
import {
  FaEye,
  FaReply,
  FaCheck,
  FaTimes,
  FaClock,
  FaFilter,
  FaSearch,
} from "react-icons/fa";

export default function ProvinceCorrectionRequestsPage() {
  const { user, userLoading } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseForm, setResponseForm] = useState({
    status: "",
    expertResponse: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // بررسی دسترسی
  if (!userLoading && (!user || user.role !== "provinceTransferExpert")) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  // دریافت درخواست‌های اصلاح مشخصات
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/admin/profile-correction-requests/province"
      );
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

  // پاسخ به درخواست
  const handleRespond = async () => {
    if (!responseForm.status || !responseForm.expertResponse) {
      toast.error("لطفاً وضعیت و پاسخ را تکمیل کنید");
      return;
    }

    if (responseForm.expertResponse.length < 10) {
      toast.error("پاسخ باید حداقل 10 کاراکتر باشد");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/admin/profile-correction-requests/${selectedRequest._id}/respond`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(responseForm),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("پاسخ با موفقیت ثبت شد");
        setShowResponseModal(false);
        setSelectedRequest(null);
        setResponseForm({ status: "", expertResponse: "" });
        fetchRequests();
      } else {
        toast.error(data.error || "خطا در ثبت پاسخ");
      }
    } catch (error) {
      console.error("Error responding:", error);
      toast.error("خطا در ثبت پاسخ");
    } finally {
      setSubmitting(false);
    }
  };

  // فیلتر کردن درخواست‌ها
  const filteredRequests = requests.filter((request) => {
    const matchesFilter = filter === "all" || request.status === filter;
    const matchesSearch =
      request.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.nationalId?.includes(searchTerm) ||
      request.disputedField?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // تابع برای گرفتن رنگ وضعیت
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // تابع برای گرفتن آیکون وضعیت
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FaClock className="h-4 w-4" />;
      case "under_review":
        return <FaEye className="h-4 w-4" />;
      case "approved":
        return <FaCheck className="h-4 w-4" />;
      case "rejected":
        return <FaTimes className="h-4 w-4" />;
      default:
        return <FaClock className="h-4 w-4" />;
    }
  };

  // تابع برای گرفتن متن وضعیت
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "در انتظار";
      case "under_review":
        return "در حال بررسی";
      case "approved":
        return "تایید شده";
      case "rejected":
        return "رد شده";
      default:
        return "نامشخص";
    }
  };

  useEffect(() => {
    if (user && user.role === "provinceTransferExpert") {
      fetchRequests();
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
        <div className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaReply className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  مدیریت درخواست‌های اصلاح مشخصات استان
                </h1>
                <p className="text-purple-100 text-sm">
                  بررسی و پاسخ به درخواست‌های اصلاح مشخصات کاربران استان
                </p>
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
                    placeholder="جستجو بر اساس نام، کد ملی یا فیلد مورد اعتراض..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* فیلتر وضعیت */}
              <div className="md:w-48">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار</option>
                  <option value="under_review">در حال بررسی</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                </select>
              </div>

              {/* تعداد نتایج */}
              <div className="flex items-center text-sm text-gray-600">
                <FaFilter className="h-4 w-4 ml-2" />
                {filteredRequests.length} درخواست
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-gray-600 mt-4">در حال بارگذاری...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FaEye className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              درخواستی یافت نشد
            </h3>
            <p className="text-gray-600">
              {requests.length === 0
                ? "هیچ درخواست اصلاح مشخصاتی برای استان شما ثبت نشده است."
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
                      کاربر
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      فیلد مورد اعتراض
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ درخواست
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-right">
                  {filteredRequests.map((request) => (
                    <tr
                      key={request._id}
                      className="hover:bg-gray-50 text-right"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {request.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.nationalId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.phone}
                          </div>
                          {request.personnelCode && (
                            <div className="text-sm text-gray-500">
                              کد پرسنلی: {request.personnelCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {getFieldDisplayName(request.disputedField)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 ">
                        {new Date(request.createdAt).toLocaleDateString(
                          "fa-IR"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {getStatusIcon(request.status)}
                          {getStatusText(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            مشاهده
                          </button>
                          {["pending", "under_review"].includes(
                            request.status
                          ) && (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowResponseModal(true);
                                setResponseForm({
                                  status:
                                    request.status === "pending"
                                      ? "under_review"
                                      : "",
                                  expertResponse: "",
                                });
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              پاسخ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal مشاهده جزئیات */}
        {selectedRequest && !showResponseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-lg">
                      <FaEye className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        جزئیات درخواست اصلاح مشخصات
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* اطلاعات کاربر */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    اطلاعات کاربر
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
                        شماره همراه:
                      </span>
                      <div className="text-gray-900">
                        {selectedRequest.phone}
                      </div>
                    </div>
                    {selectedRequest.personnelCode && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          کد پرسنلی:
                        </span>
                        <div className="text-gray-900">
                          {selectedRequest.personnelCode}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        وضعیت:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                          selectedRequest.status
                        )}`}
                      >
                        {getStatusIcon(selectedRequest.status)}
                        {getStatusText(selectedRequest.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* جزئیات درخواست */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">
                    جزئیات درخواست
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        فیلد مورد اعتراض:
                      </span>
                      <div className="text-gray-900">
                        {getFieldDisplayName(selectedRequest.disputedField)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        توضیحات:
                      </span>
                      <div className="bg-white p-3 rounded border text-gray-900 whitespace-pre-wrap">
                        {selectedRequest.description}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        تاریخ ارسال:
                      </span>
                      <div className="text-gray-900">
                        {new Date(selectedRequest.createdAt).toLocaleDateString(
                          "fa-IR"
                        )}{" "}
                        -{" "}
                        {new Date(selectedRequest.createdAt).toLocaleTimeString(
                          "fa-IR"
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* تصویر پیوست */}
                {selectedRequest.attachmentImage && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      تصویر پیوست:
                    </span>
                    <div className="mt-2">
                      <img
                        src={`/api/auth/getimg/${selectedRequest.attachmentImage}`}
                        alt="تصویر پیوست"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  </div>
                )}

                {/* پاسخ کارشناس */}
                {selectedRequest.expertResponse && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-800 mb-3">
                      پاسخ کارشناس
                    </h4>
                    <div className="text-purple-900 whitespace-pre-wrap">
                      {selectedRequest.expertResponse}
                    </div>
                    {selectedRequest.respondedAt && (
                      <div className="text-sm text-purple-600 mt-2">
                        تاریخ پاسخ:{" "}
                        {new Date(
                          selectedRequest.respondedAt
                        ).toLocaleDateString("fa-IR")}{" "}
                        -{" "}
                        {new Date(
                          selectedRequest.respondedAt
                        ).toLocaleTimeString("fa-IR")}
                      </div>
                    )}
                  </div>
                )}

                {/* دکمه‌ها */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    بستن
                  </button>
                  {["pending", "under_review"].includes(
                    selectedRequest.status
                  ) && (
                    <button
                      onClick={() => {
                        setShowResponseModal(true);
                        setResponseForm({
                          status:
                            selectedRequest.status === "pending"
                              ? "under_review"
                              : "",
                          expertResponse: "",
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      پاسخ دادن
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal پاسخ */}
        {showResponseModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-lg">
                      <FaReply className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">پاسخ به درخواست</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseForm({ status: "", expertResponse: "" });
                    }}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* انتخاب وضعیت */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وضعیت جدید <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={responseForm.status}
                    onChange={(e) =>
                      setResponseForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="under_review">در حال بررسی</option>
                    <option value="approved">تایید شده</option>
                    <option value="rejected">رد شده</option>
                  </select>
                </div>

                {/* پاسخ کارشناس */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    پاسخ کارشناس <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={responseForm.expertResponse}
                    onChange={(e) =>
                      setResponseForm((prev) => ({
                        ...prev,
                        expertResponse: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="پاسخ و توضیحات خود را وارد کنید..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    حداقل 10 کاراکتر - {responseForm.expertResponse.length}{" "}
                    کاراکتر
                  </div>
                </div>

                {/* دکمه‌ها */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseForm({ status: "", expertResponse: "" });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        در حال ارسال...
                      </>
                    ) : (
                      <>
                        <FaCheck className="h-4 w-4" />
                        ثبت پاسخ
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
