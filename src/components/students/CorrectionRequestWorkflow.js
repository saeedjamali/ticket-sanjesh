import { useState, useEffect } from "react";
import { 
  FaEye, 
  FaCheckCircle, 
  FaCheck, 
  FaTimes, 
  FaClock, 
  FaExclamationCircle,
  FaChevronDown,
  FaChevronUp 
} from "react-icons/fa";

export default function CorrectionRequestWorkflow() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/correction-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching correction requests:", error);
    } finally {
      setLoading(false);
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
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // اگر درخواستی نداریم، چیزی نمایش نده
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6 mt-2">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900"
        >
          <div className="flex items-center gap-3">
            <span>گردش کار درخواست‌های اصلاح آمار</span>
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {requests.length}
            </span>
          </div>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(request.status)}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">تعداد فعلی:</span>
                        <span className="font-bold text-gray-900 mr-2">
                          {request.currentStudentCount?.toLocaleString("fa-IR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">تعداد اصلاح شده:</span>
                        <span className="font-bold text-blue-600 mr-2">
                          {request.correctedStudentCount?.toLocaleString("fa-IR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">تاریخ درخواست:</span>
                        <span className="font-bold text-gray-900 mr-2">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">سال تحصیلی:</span>
                        <span className="font-bold text-gray-900 mr-2">
                          {request.academicYear}
                        </span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-600">دلیل درخواست:</span>
                        <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                      </div>
                    )}

                    {/* نمایش پاسخ‌های منطقه و استان */}
                    {request.districtResponse && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <FaCheckCircle className="text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">
                            پاسخ کارشناس منطقه:
                          </span>
                        </div>
                        <p className="text-sm text-blue-900">{request.districtResponse}</p>
                        {request.districtReviewedAt && (
                          <p className="text-xs text-blue-600 mt-1">
                            {formatDate(request.districtReviewedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {request.provinceResponse && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <FaCheck className="text-green-600" />
                          <span className="text-sm font-semibold text-green-800">
                            پاسخ کارشناس استان:
                          </span>
                        </div>
                        <p className="text-sm text-green-900">{request.provinceResponse}</p>
                        {request.provinceReviewedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            {formatDate(request.provinceReviewedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 