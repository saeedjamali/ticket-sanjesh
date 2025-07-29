"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useUserContext } from "@/context/UserContext";
import {
  FaEye,
  FaCheck,
  FaCheckCircle,
  FaTimes,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaFilter,
  FaExclamationCircle,
} from "react-icons/fa";

export default function CorrectionRequestsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState(""); // "approve" or "reject"
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userLoading) {
      fetchRequests();
    }
  }, [statusFilter, userLoading]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(
        `/api/correction-requests?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setRequests(data.data || []);
      } else {
        toast.error(data.message || "خطا در دریافت درخواست‌ها");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
  };

  const handleResponse = (action) => {
    setResponseAction(action);
    setResponseText("");
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!responseText.trim() || responseText.length < 5) {
      toast.error("پاسخ باید حداقل 5 کاراکتر باشد");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/correction-requests/${selectedRequest._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: responseAction,
            response: responseText,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowResponseModal(false);
        setSelectedRequest(null);
        setResponseAction("");
        setResponseText("");
        fetchRequests(); // بروزرسانی لیست
      } else {
        toast.error(data.message || "خطا در ارسال پاسخ");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FaClock className="text-yellow-600" />;
      case "approved_district":
        return <FaCheckCircle className="text-blue-600" />;
      case "approved_province":
        return <FaCheck className="text-green-600" />;
      case "rejected_district":
      case "rejected_province":
      case "rejected":
        return <FaTimes className="text-red-600" />;
      default:
        return <FaExclamationCircle className="text-gray-600" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "در انتظار بررسی کارشناس منطقه";
      case "approved_district":
        return "تایید شده توسط منطقه - در انتظار تایید استان";
      case "approved_province":
        return "تایید نهایی و اعمال شده";
      case "rejected_district":
        return "رد شده توسط کارشناس منطقه";
      case "rejected_province":
        return "رد شده توسط کارشناس استان";
      case "rejected":
        return "رد شده";
      default:
        return "نامشخص";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved_district":
        return "bg-blue-100 text-blue-800";
      case "approved_province":
        return "bg-green-100 text-green-800";
      case "rejected_district":
      case "rejected_province":
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canReview = (request) => {
    if (user?.role === "districtRegistrationExpert") {
      return request.status === "pending";
    } else if (user?.role === "provinceRegistrationExpert") {
      return request.status === "approved_district";
    }
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (userLoading || loading) {
    return <LoadingSpinner />;
  }

  // اگر کاربر وارد نشده باشد
  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">لطفا وارد حساب کاربری خود شوید</p>
        </div>
      </div>
    );
  }

  // بررسی دسترسی کاربر
  if (
    !["districtRegistrationExpert", "provinceRegistrationExpert"].includes(
      user.role
    )
  ) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600">شما مجاز به مشاهده این صفحه نیستید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* لیست درخواست‌ها */}
      <div className="bg-white rounded-lg shadow">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FaExclamationCircle className="mx-auto text-4xl mb-4" />
            <p>درخواستی یافت نشد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800   uppercase tracking-wider">
                    واحد سازمانی
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    درخواست کننده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    آمار
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    تاریخ درخواست
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div>
                        <div className="text-sm font-medium text-gray-900 ">
                          {request.examCenterName}
                        </div>
                        <div className="text-sm text-gray-500">
                          کد: {request.examCenterCode}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.districtName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 ml-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.requestedByName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.requestedByPhone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        فعلی:{" "}
                        <span className="font-medium">
                          {request.currentStudentCount}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        صحیح:{" "}
                        <span className="font-medium">
                          {request.correctedStudentCount}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          request.correctedStudentCount -
                            request.currentStudentCount >
                          0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        تفاوت:{" "}
                        {request.correctedStudentCount -
                          request.currentStudentCount >
                        0
                          ? "+"
                          : ""}
                        {request.correctedStudentCount -
                          request.currentStudentCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center text-sm text-gray-900">
                        <FaCalendarAlt className="text-gray-400 ml-2" />
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="mr-1">
                          {getStatusText(request.status)}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="text-blue-600 hover:text-blue-900"
                          title="مشاهده جزئیات"
                        >
                          <FaEye />
                        </button>
                        {canReview(request) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                handleResponse("approve");
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="تایید"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                handleResponse("reject");
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="رد"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal مشاهده جزئیات */}
      {selectedRequest && !showResponseModal && (
        <div className="fixed inset-0 bg-gray-400 bg-opacity-15 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                جزئیات درخواست اصلاح آمار
              </h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    واحد سازمانی
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.examCenterName}
                  </p>
                  <p className="text-xs text-gray-500">
                    کد: {selectedRequest.examCenterCode}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    منطقه
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.districtName}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  توضیحات درخواست
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {selectedRequest.reason}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    آمار فعلی
                  </label>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedRequest.currentStudentCount}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    آمار صحیح
                  </label>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedRequest.correctedStudentCount}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    تفاوت
                  </label>
                  <p
                    className={`text-lg font-bold ${
                      selectedRequest.correctedStudentCount -
                        selectedRequest.currentStudentCount >
                      0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedRequest.correctedStudentCount -
                      selectedRequest.currentStudentCount >
                    0
                      ? "+"
                      : ""}
                    {selectedRequest.correctedStudentCount -
                      selectedRequest.currentStudentCount}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  وضعیت
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedRequest.status
                  )}`}
                >
                  {getStatusIcon(selectedRequest.status)}
                  <span className="mr-1">
                    {getStatusText(selectedRequest.status)}
                  </span>
                </span>
              </div>

              {/* نمایش پاسخ‌های قبلی */}
              {selectedRequest.districtResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    پاسخ منطقه
                  </label>
                  <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded">
                    {selectedRequest.districtResponse}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(selectedRequest.districtReviewedAt)}
                  </p>
                </div>
              )}

              {selectedRequest.provinceResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    پاسخ استان
                  </label>
                  <p className="text-sm text-gray-900 bg-green-50 p-3 rounded">
                    {selectedRequest.provinceResponse}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(selectedRequest.provinceReviewedAt)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              {canReview(selectedRequest) && (
                <>
                  <button
                    onClick={() => handleResponse("reject")}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    رد درخواست
                  </button>
                  <button
                    onClick={() => handleResponse("approve")}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    تایید درخواست
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal پاسخ */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-gray-400 bg-opacity-15 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {responseAction === "approve" ? "تایید درخواست" : "رد درخواست"}
              </h3>
              <button
                onClick={() => setShowResponseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توضیحات {responseAction === "approve" ? "تایید" : "رد"}:
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder={`دلیل ${
                  responseAction === "approve" ? "تایید" : "رد"
                } درخواست را بنویسید...`}
              />
              <p className="text-xs text-gray-500 mt-1">
                حداقل 5 کاراکتر وارد کنید
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResponseModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={submitting}
              >
                انصراف
              </button>
              <button
                onClick={submitResponse}
                className={`px-4 py-2 text-white rounded ${
                  responseAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={submitting}
              >
                {submitting ? "در حال ارسال..." : "تایید"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
