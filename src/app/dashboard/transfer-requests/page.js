"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import {
  FaExchangeAlt,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaEye,
  FaClock,
  FaInfoCircle,
  FaFilter,
  FaUserGraduate,
  FaSchool,
  FaCalendarAlt,
  FaSearch,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/permissions";

export default function TransferRequestsPage() {
  const { user } = useUserContext();
  const [transferRequests, setTransferRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, incoming, outgoing
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("nationalId"); // nationalId, orgCode
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseData, setResponseData] = useState({
    action: "",
    description: "",
  });

  // States برای جستجوی دانش‌آموز (فقط برای PROVINCE_TECH_EXPERT)
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [showStudentSearchModal, setShowStudentSearchModal] = useState(false);

  // Helper functions for translation
  const getGenderText = (gender) => {
    switch (gender) {
      case "male":
        return "پسر";
      case "female":
        return "دختر";
      default:
        return gender || "نامشخص";
    }
  };

  const getStudentTypeText = (studentType) => {
    switch (studentType) {
      case "normal":
        return "عادی";
      default:
        return studentType || "نامشخص";
    }
  };

  // تشخیص اینکه آیا درخواست outgoing و pending است
  const shouldBlurData = (request) => {
    if (!user) return false;

    // اگر کاربر ارسال کننده درخواست است (outgoing) و وضعیت pending است
    const isOutgoing = request.isOutgoing; // این فیلد از API می‌آید
    const isPending = request.status === "pending";

    return isOutgoing && isPending;
  };

  // فیلتر کردن درخواست‌ها بر اساس جستجو
  const filterRequests = (requests, searchTerm, searchType) => {
    if (!searchTerm.trim()) {
      return requests;
    }

    return requests.filter((request) => {
      const search = searchTerm.toLowerCase().trim();

      if (searchType === "nationalId") {
        return request.studentNationalId.includes(search);
      } else if (searchType === "orgCode") {
        // جستجو در کد واحد سازمانی مبدا و مقصد
        const fromOrgCode =
          request.fromSchool?.organizationalUnitCode?.toLowerCase() || "";
        const toOrgCode =
          request.toSchool?.organizationalUnitCode?.toLowerCase() || "";
        return fromOrgCode.includes(search) || toOrgCode.includes(search);
      }

      return false;
    });
  };

  useEffect(() => {
    fetchTransferRequests();
  }, [filter]);

  // فیلتر کردن درخواست‌ها وقتی جستجو یا داده‌ها تغییر کند
  useEffect(() => {
    const filtered = filterRequests(transferRequests, searchTerm, searchType);
    setFilteredRequests(filtered);
  }, [transferRequests, searchTerm, searchType]);

  // جستجوی دانش‌آموز در کل استان (فقط برای PROVINCE_TECH_EXPERT)
  const searchStudentsInProvince = async (nationalId) => {
    if (!nationalId || nationalId.trim().length < 3) {
      setStudentSearchResults([]);
      return;
    }

    setStudentSearchLoading(true);
    try {
      const response = await fetch(
        `/api/students/search-province?nationalId=${encodeURIComponent(
          nationalId.trim()
        )}`
      );
      const result = await response.json();

      if (result.success) {
        setStudentSearchResults(result.data);
      } else {
        console.error("Error searching students:", result.error);
        toast.error(result.error || "خطا در جستجوی دانش‌آموزان");
        setStudentSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching students:", error);
      toast.error("خطا در جستجوی دانش‌آموزان");
      setStudentSearchResults([]);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // جستجوی دانش‌آموز با تأخیر
  useEffect(() => {
    if (user?.role === ROLES.PROVINCE_TECH_EXPERT && studentSearchTerm) {
      const timeoutId = setTimeout(() => {
        searchStudentsInProvince(studentSearchTerm);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setStudentSearchResults([]);
    }
  }, [studentSearchTerm, user?.role]);

  const fetchTransferRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transfer-requests?type=${filter}`);
      const result = await response.json();

      if (result.success) {
        setTransferRequests(result.data);
      } else {
        console.error("❌ API Error:", result.error);
        toast.error(result.error || "خطا در دریافت درخواست‌های جابجایی");
      }
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      toast.error("خطا در دریافت درخواست‌های جابجایی");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setResponseData({ action: "", description: "" });
  };

  const handleRespond = async (action) => {
    if (
      !selectedRequest ||
      !selectedRequest.canRespond ||
      selectedRequest.status !== "pending"
    ) {
      toast.error("شما مجاز به پاسخ این درخواست نیستید");
      return;
    }

    setResponding(true);

    try {
      const response = await fetch(
        `/api/transfer-requests/${selectedRequest._id}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: action,
            responseDescription: responseData.description,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setShowModal(false);
        fetchTransferRequests(); // بروزرسانی لیست
      } else {
        toast.error(result.error || "خطا در پردازش پاسخ");
      }
    } catch (error) {
      console.error("Error responding to transfer request:", error);
      toast.error("خطا در ارسال پاسخ");
    } finally {
      setResponding(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaClock className="mr-1" />
            در انتظار بررسی
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheck className="mr-1" />
            تایید شده
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaTimes className="mr-1" />
            رد شده
          </span>
        );
      default:
        return null;
    }
  };

  const getRequestTypeBadge = (request) => {
    if (request.isIncoming) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
          دریافتی
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
          ارسالی
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaExchangeAlt className="text-blue-600 text-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">
            درخواست‌های جابجایی دانش‌آموز
          </h1>
        </div>

        {/* فیلتر و دکمه‌ها */}
        <div className="flex items-center gap-4">
          {/* دکمه جستجوی دانش‌آموز (فقط برای PROVINCE_TECH_EXPERT) */}
          {user?.role === ROLES.PROVINCE_TECH_EXPERT && (
            <button
              onClick={() => setShowStudentSearchModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              <FaUserGraduate />
              جستجوی دانش‌آموز
            </button>
          )}

          {/* فیلتر */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">همه درخواست‌ها</option>
              <option value="incoming">درخواست‌های دریافتی</option>
              <option value="outgoing">درخواست‌های ارسالی</option>
            </select>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <FaSearch className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">جستجو:</span>
          </div>

          {/* نوع جستجو */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">نوع جستجو:</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="nationalId">کد ملی دانش‌آموز</option>
              <option value="orgCode">کد واحد سازمانی</option>
            </select>
          </div>

          {/* کادر جستجو */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                searchType === "nationalId"
                  ? "کد ملی دانش‌آموز را وارد کنید..."
                  : "کد واحد سازمانی را وارد کنید..."
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* پاک کردن جستجو */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              پاک کردن
            </button>
          )}

          {/* نتایج */}
          <div className="text-sm text-gray-600">
            {searchTerm ? (
              <span>
                {filteredRequests.length} نتیجه از {transferRequests.length}{" "}
                درخواست
              </span>
            ) : (
              <span>مجموع: {transferRequests.length} درخواست</span>
            )}
          </div>
        </div>
      </div>

      {/* راهنما */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">راهنما:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>درخواست‌های دریافتی:</strong> درخواست‌هایی که مدارس دیگر
                برای انتقال دانش‌آموزان به مدرسه شما ارسال کرده‌اند
              </li>
              <li>
                <strong>درخواست‌های ارسالی:</strong> درخواست‌هایی که شما برای
                انتقال دانش‌آموزان از مدارس دیگر ارسال کرده‌اید
              </li>
              <li>درخواست‌های دریافتی نیاز به بررسی و پاسخ شما دارند</li>
            </ul>
          </div>
        </div>
      </div>

      {/* لیست درخواست‌ها */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FaExchangeAlt className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? "نتیجه‌ای برای جستجوی شما یافت نشد"
                : filter === "incoming"
                ? "درخواست دریافتی‌ای وجود ندارد"
                : filter === "outgoing"
                ? "درخواست ارسالی‌ای وجود ندارد"
                : "درخواستی وجود ندارد"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    دانش‌آموز
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    سال تحصیلی
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدرسه مبدا
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدرسه مقصد
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ درخواست
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request, index) => {
                  const shouldBlur = shouldBlurData(request);
                  return (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRequestTypeBadge(request)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`flex items-center gap-2 text-right ${
                            shouldBlur ? "filter blur-sm opacity-50" : ""
                          }`}
                        >
                          <FaUserGraduate className="text-blue-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {shouldBlur
                                ? "●●● ●●●"
                                : `${request.studentInfo.firstName} ${request.studentInfo.lastName}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              کد ملی:{" "}
                              {shouldBlur
                                ? "●●●●●●●●●●"
                                : request.studentNationalId}
                            </div>
                            <div className="text-sm text-gray-500">
                              پایه:{" "}
                              {shouldBlur
                                ? "●●●"
                                : request.studentInfo?.gradeName ||
                                  request.studentInfo?.gradeCode ||
                                  "نامشخص"}
                              {" - "}
                              رشته:{" "}
                              {shouldBlur
                                ? "●●●"
                                : request.studentInfo?.fieldName ||
                                  request.studentInfo?.fieldCode ||
                                  "نامشخص"}
                            </div>
                            <div className="text-sm text-gray-500">
                              دوره:{" "}
                              {shouldBlur
                                ? "●●●"
                                : request.studentInfo.academicCourse}{" "}
                              | نوع:{" "}
                              {shouldBlur
                                ? "●●●"
                                : getStudentTypeText(
                                    request.studentInfo.studentType
                                  )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt className="text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {request.academicYear}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-right">
                          <FaSchool className="text-green-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.fromSchool.schoolName}
                            </div>
                            <div className="text-sm text-gray-500">
                              کد: {request.fromSchool.organizationalUnitCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              منطقه:{" "}
                              {request.fromSchool?.districtName || "نامشخص"}{" "}
                              (کد:{" "}
                              {request.fromSchool?.districtCode || "نامشخص"})
                            </div>
                            {request.fromSchool?.provinceName &&
                              request.fromSchool.provinceName !== "نامشخص" && (
                                <div className="text-sm text-gray-500">
                                  استان: {request.fromSchool.provinceName}
                                </div>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`flex items-center gap-2 text-right ${
                            shouldBlur ? "filter blur-sm opacity-50" : ""
                          }`}
                        >
                          <FaSchool className="text-orange-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {shouldBlur
                                ? "●●● ●●● ●●●"
                                : request.toSchool.schoolName}
                            </div>
                            <div className="text-sm text-gray-500">
                              کد:{" "}
                              {shouldBlur
                                ? "●●●●●●"
                                : request.toSchool.organizationalUnitCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              منطقه:{" "}
                              {shouldBlur
                                ? "●●●"
                                : request.toSchool?.districtName ||
                                  "نامشخص"}{" "}
                              (کد:{" "}
                              {shouldBlur
                                ? "●●●"
                                : request.toSchool?.districtCode || "نامشخص"}
                              )
                            </div>
                            {request.toSchool?.provinceName &&
                              request.toSchool.provinceName !== "نامشخص" && (
                                <div className="text-sm text-gray-500">
                                  استان:{" "}
                                  {shouldBlur
                                    ? "●●●"
                                    : request.toSchool.provinceName}
                                </div>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {new Date(request.requestDate).toLocaleDateString(
                          "fa-IR"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 mx-auto"
                        >
                          <FaEye />
                          جزئیات
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال جزئیات درخواست */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* هدر */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FaExchangeAlt className="text-blue-600 text-xl" />
                <h2 className="text-xl font-bold text-gray-900">
                  جزئیات درخواست جابجایی
                </h2>
                {getRequestTypeBadge(selectedRequest)}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* محتوا */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                  const shouldBlurModal = shouldBlurData(selectedRequest);
                  return (
                    <>
                      {/* اطلاعات دانش‌آموز */}
                      <div
                        className={`bg-blue-50 rounded-lg p-4 ${
                          shouldBlurModal ? "filter blur-sm opacity-50" : ""
                        }`}
                      >
                        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <FaUserGraduate />
                          اطلاعات دانش‌آموز
                          {shouldBlurModal && (
                            <span className="text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                              در انتظار تایید
                            </span>
                          )}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              نام و نام خانوادگی:
                            </span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●● ●●●"
                                : `${selectedRequest.studentInfo.firstName} ${selectedRequest.studentInfo.lastName}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">نام پدر:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo.fatherName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">کد ملی:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●●●●●●●●"
                                : selectedRequest.studentNationalId}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">تاریخ تولد:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●●/●●/●●"
                                : selectedRequest.studentInfo.birthDate}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">جنسیت:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : getGenderText(
                                    selectedRequest.studentInfo.gender
                                  )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ملیت:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo.nationality}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">شماره همراه:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●●●●●●●●●"
                                : selectedRequest.studentInfo.mobile || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">آدرس:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●● ●●● ●●●"
                                : selectedRequest.studentInfo.address || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">دوره تحصیلی:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo.academicCourse}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">پایه تحصیلی:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo?.gradeName ||
                                  selectedRequest.studentInfo?.gradeCode ||
                                  "نامشخص"}
                              {!shouldBlurModal &&
                                selectedRequest.studentInfo?.gradeName && (
                                  <span className="text-gray-500 text-sm">
                                    {" "}
                                    (کد: {selectedRequest.studentInfo.gradeCode}
                                    )
                                  </span>
                                )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">رشته تحصیلی:</span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo?.fieldName ||
                                  selectedRequest.studentInfo?.fieldCode ||
                                  "نامشخص"}
                              {!shouldBlurModal &&
                                selectedRequest.studentInfo?.fieldName && (
                                  <span className="text-gray-500 text-sm">
                                    {" "}
                                    (کد: {selectedRequest.studentInfo.fieldCode}
                                    )
                                  </span>
                                )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              نوع دانش‌آموز:
                            </span>
                            <span className="font-medium">
                              {shouldBlurModal
                                ? "●●●"
                                : getStudentTypeText(
                                    selectedRequest.studentInfo.studentType
                                  )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">سال تحصیلی:</span>
                            <span className="font-medium">
                              {selectedRequest.academicYear}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">وضعیت فعال:</span>
                            <span
                              className={`font-medium ${
                                selectedRequest.studentInfo.isActive
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {shouldBlurModal
                                ? "●●●"
                                : selectedRequest.studentInfo.isActive
                                ? "فعال"
                                : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* اطلاعات مدارس */}
                      <div className="space-y-4">
                        {/* مدرسه مبدا */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                            <FaSchool />
                            مدرسه مبدا (درخواست‌کننده)
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">نام مدرسه:</span>
                              <span className="font-medium">
                                {selectedRequest.fromSchool.schoolName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">کد مدرسه:</span>
                              <span className="font-medium">
                                {
                                  selectedRequest.fromSchool
                                    .organizationalUnitCode
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">منطقه:</span>
                              <span className="font-medium">
                                {selectedRequest.fromSchool.districtName} (کد:{" "}
                                {selectedRequest.fromSchool.districtCode})
                              </span>
                            </div>
                            {selectedRequest.fromSchool.provinceName && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">استان:</span>
                                <span className="font-medium">
                                  {selectedRequest.fromSchool.provinceName} (کد:{" "}
                                  {selectedRequest.fromSchool.provinceCode})
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                مدیر درخواست‌کننده:
                              </span>
                              <span className="font-medium">
                                {selectedRequest.fromSchool.managerName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* مدرسه مقصد */}
                        <div
                          className={`bg-orange-50 rounded-lg p-4 ${
                            shouldBlurModal ? "filter blur-sm opacity-50" : ""
                          }`}
                        >
                          <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                            <FaSchool />
                            مدرسه مقصد (فعلی دانش‌آموز)
                            {shouldBlurModal && (
                              <span className="text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                در انتظار تایید
                              </span>
                            )}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">نام مدرسه:</span>
                              <span className="font-medium">
                                {shouldBlurModal
                                  ? "●●● ●●● ●●●"
                                  : selectedRequest.toSchool.schoolName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">کد مدرسه:</span>
                              <span className="font-medium">
                                {shouldBlurModal
                                  ? "●●●●●●"
                                  : selectedRequest.toSchool
                                      .organizationalUnitCode}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">منطقه:</span>
                              <span className="font-medium">
                                {shouldBlurModal
                                  ? "●●● (کد: ●●●)"
                                  : `${selectedRequest.toSchool.districtName} (کد: ${selectedRequest.toSchool.districtCode})`}
                              </span>
                            </div>
                            {selectedRequest.toSchool.provinceName && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">استان:</span>
                                <span className="font-medium">
                                  {shouldBlurModal
                                    ? "●●● (کد: ●●)"
                                    : `${selectedRequest.toSchool.provinceName} (کد: ${selectedRequest.toSchool.provinceCode})`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* توضیحات درخواست */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  توضیحات درخواست:
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.requestDescription}
                </p>
              </div>

              {/* اطلاعات وضعیت */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-600">وضعیت: </span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      تاریخ درخواست:{" "}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(selectedRequest.requestDate).toLocaleDateString(
                        "fa-IR"
                      )}
                    </span>
                  </div>
                  {selectedRequest.responseDate && (
                    <div>
                      <span className="text-sm text-gray-600">
                        تاریخ پاسخ:{" "}
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(
                          selectedRequest.responseDate
                        ).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* پاسخ مدیر (در صورت وجود) */}
              {selectedRequest.responseDescription && (
                <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                    پاسخ مدیر:
                  </h3>
                  <p className="text-yellow-700 whitespace-pre-wrap">
                    {selectedRequest.responseDescription}
                  </p>
                </div>
              )}

              {/* فرم پاسخ (فقط برای درخواست‌های دریافتی در انتظار) */}
              {selectedRequest.canRespond && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    پاسخ به درخواست:
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        توضیحات پاسخ (اختیاری):
                      </label>
                      <textarea
                        value={responseData.description}
                        onChange={(e) =>
                          setResponseData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="توضیحات اضافی در مورد پاسخ شما..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleRespond("reject")}
                        disabled={responding}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {responding ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTimes />
                        )}
                        رد درخواست
                      </button>
                      <button
                        onClick={() => handleRespond("approve")}
                        disabled={responding}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {responding ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaCheck />
                        )}
                        تایید و انتقال
                      </button>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <FaInfoCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">توجه:</p>
                          <p>
                            در صورت تایید، دانش‌آموز از مدرسه شما حذف و به مدرسه
                            درخواست‌کننده منتقل خواهد شد. این عمل قابل برگشت
                            نیست.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* دکمه بستن */}
            {!selectedRequest.canRespond && (
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  بستن
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* مودال جستجوی دانش‌آموز */}
      {showStudentSearchModal && user?.role === ROLES.PROVINCE_TECH_EXPERT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* هدر */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FaUserGraduate className="text-green-600 text-xl" />
                <h2 className="text-xl font-bold text-gray-900">
                  جستجوی دانش‌آموز در استان
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowStudentSearchModal(false);
                  setStudentSearchTerm("");
                  setStudentSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* محتوا */}
            <div className="p-6">
              {/* راهنما */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">راهنما:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>
                        با وارد کردن کد ملی، تمام دانش‌آموزان استان را جستجو
                        کنید
                      </li>
                      <li>نتایج شامل تمام سال‌های تحصیلی است</li>
                      <li>حداقل 3 کاراکتر وارد کنید</li>
                      <li>حداکثر 50 نتیجه نمایش داده می‌شود</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* جستجو */}
              <div className="mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FaSearch className="text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">
                      کد ملی دانش‌آموز:
                    </label>
                  </div>
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="کد ملی دانش‌آموز را وارد کنید..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  {studentSearchLoading && (
                    <FaSpinner className="animate-spin text-gray-500" />
                  )}
                </div>
              </div>

              {/* نتایج */}
              {studentSearchTerm.length >= 3 && (
                <div className="border border-gray-200 rounded-lg">
                  {studentSearchLoading ? (
                    <div className="text-center py-8">
                      <FaSpinner className="animate-spin mx-auto text-2xl text-gray-400 mb-2" />
                      <p className="text-gray-500">در حال جستجو...</p>
                    </div>
                  ) : studentSearchResults.length === 0 ? (
                    <div className="text-center py-8">
                      <FaUserGraduate className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-500">دانش‌آموزی یافت نشد</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              اطلاعات دانش‌آموز
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              سال تحصیلی
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              پایه و رشته
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              مدرسه
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              وضعیت
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentSearchResults.map((student, index) => (
                            <tr
                              key={`${student._id}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center gap-2">
                                  <FaUserGraduate className="text-blue-500" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.firstName} {student.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      کد ملی: {student.nationalId}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      نام پدر: {student.fatherName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      جنسیت: {getGenderText(student.gender)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center gap-1">
                                  <FaCalendarAlt className="text-gray-400" />
                                  <span className="text-sm text-gray-900">
                                    {student.academicYear}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  دوره: {student.academicCourse}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-900">
                                  پایه:{" "}
                                  {student.gradeName ||
                                    student.gradeCode ||
                                    "نامشخص"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  رشته:{" "}
                                  {student.fieldName ||
                                    student.fieldCode ||
                                    "نامشخص"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  نوع: {getStudentTypeText(student.studentType)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center gap-2">
                                  <FaSchool className="text-orange-500" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.examCenter?.name || "نامشخص"}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      کد: {student.examCenter?.code || "نامشخص"}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      منطقه:{" "}
                                      {student.examCenter?.district?.name ||
                                        "نامشخص"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    student.isActive
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {student.isActive ? "فعال" : "غیرفعال"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* خلاصه نتایج */}
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          {studentSearchResults.length} نتیجه یافت شد
                          {studentSearchResults.length === 50 &&
                            " (حداکثر 50 نتیجه نمایش داده می‌شود)"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {studentSearchTerm.length > 0 && studentSearchTerm.length < 3 && (
                <div className="text-center py-8">
                  <FaInfoCircle className="mx-auto text-3xl text-gray-400 mb-2" />
                  <p className="text-gray-500">حداقل 3 کاراکتر وارد کنید</p>
                </div>
              )}
            </div>

            {/* پایین */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowStudentSearchModal(false);
                  setStudentSearchTerm("");
                  setStudentSearchResults([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
