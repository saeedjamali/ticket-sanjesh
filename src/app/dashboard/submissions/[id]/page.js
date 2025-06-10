"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";

export default function SubmissionDetailPage() {
  const { user, loading: userLoading } = useUserContext();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (user && params.id) {
      fetchSubmission();
    }
  }, [user, params.id]);

  const fetchSubmission = async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/submissions/${params.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت submission: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSubmission(data.submission);
      } else {
        throw new Error(data.message || "خطا در دریافت submission");
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to get status text and color
  const getStatusInfo = (status) => {
    const statusMap = {
      submitted: { text: "ارسال شده", color: "bg-blue-100 text-blue-800" },
      reviewed: { text: "بررسی شده", color: "bg-yellow-100 text-yellow-800" },
      approved: { text: "تایید شده", color: "bg-green-100 text-green-800" },
      rejected: { text: "رد شده", color: "bg-red-100 text-red-800" },
    };
    return (
      statusMap[status] || { text: status, color: "bg-gray-100 text-gray-800" }
    );
  };

  // Helper function to render field value based on type
  const renderFieldValue = (response) => {
    const { fieldType, value, files } = response;

    // Find the field definition to get options
    const field = submission.form?.fields?.find(
      (f) => f.id === response.fieldId
    );

    switch (fieldType) {
      case "checkbox":
        if (Array.isArray(value)) {
          // Convert values to labels
          if (field && field.options) {
            const labels = value.map((val) => {
              const option = field.options.find((opt) => opt.value === val);
              return option ? option.label : val;
            });
            return labels.join("، ");
          }
          return value.join("، ");
        }
        return value ? "بله" : "خیر";

      case "radio":
      case "select":
        // Convert value to label
        if (field && field.options && value) {
          const option = field.options.find((opt) => opt.value === value);
          return option ? option.label : value;
        }
        return value || "-";

      case "file":
        if (files && files.length > 0) {
          return (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">{file.originalName}</span>
                    <span className="text-sm text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <a
                    href={`/api/download/${file.filename}`}
                    download={file.originalName}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    دانلود
                  </a>
                </div>
              ))}
            </div>
          );
        }
        // Check if value is an array of file objects (new format)
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="space-y-2">
              {value.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">
                      {file.originalName || file.filename}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <a
                    href={`/api/download/${file.filename}`}
                    download={file.originalName || file.filename}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    دانلود
                  </a>
                </div>
              ))}
            </div>
          );
        }
        return "-";

      case "date":
        if (value) {
          try {
            return new Date(value).toLocaleDateString("fa-IR");
          } catch (e) {
            return value;
          }
        }
        return "-";

      case "textarea":
        return (
          <div className="whitespace-pre-wrap max-w-md">{value || "-"}</div>
        );

      default:
        return value || "-";
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">لطفا وارد شوید</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">submission یافت نشد</p>
          <Link
            href="/dashboard/submissions"
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            بازگشت به لیست
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(submission.status);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                جزئیات گزارش ارسالی
              </h1>
              <h2 className="text-xl text-gray-700">
                {submission.form?.title || "نامشخص"}
              </h2>
              {submission.form?.description && (
                <p className="text-gray-600 mt-2">
                  {submission.form.description}
                </p>
              )}
            </div>
            <div className="text-left">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusInfo.color}`}
              >
                {statusInfo.text}
              </span>
            </div>
          </div>

          {/* Submission Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">تاریخ ارسال:</span>
              <span className="mr-2 text-gray-900">
                {formatDate(submission.createdAt)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">ارسال کننده:</span>
              <span className="mr-2 text-gray-900">
                {submission.submittedBy?.fullName || "نامشخص"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">منطقه:</span>
              <span className="mr-2 text-gray-900">
                {submission.submittedByDistrict?.name || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">واحد سازمانی:</span>
              <span className="mr-2 text-gray-900">
                {submission.submittedByExamCenter?.name || "-"}
              </span>
            </div>
            {submission.reviewedBy && (
              <>
                <div>
                  <span className="font-medium text-gray-700">
                    بررسی کننده:
                  </span>
                  <span className="mr-2 text-gray-900">
                    {submission.reviewedBy.fullName}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    تاریخ بررسی:
                  </span>
                  <span className="mr-2 text-gray-900">
                    {submission.reviewedAt
                      ? formatDate(submission.reviewedAt)
                      : "-"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Review Notes */}
          {submission.reviewNotes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">یادداشت بررسی:</h3>
              <p className="text-gray-900 whitespace-pre-wrap">
                {submission.reviewNotes}
              </p>
            </div>
          )}
        </div>

        {/* Form Responses */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            پاسخ‌های فرم
          </h3>

          {submission.responses && submission.responses.length > 0 ? (
            <div className="space-y-6">
              {submission.responses.map((response, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {response.fieldLabel}
                      {response.fieldType && (
                        <span className="text-xs text-gray-500 mr-2">
                          ({response.fieldType})
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="text-sm text-gray-900">
                    {renderFieldValue(response)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">هیچ پاسخی یافت نشد</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between">
            <Link
              href="/dashboard/submissions"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              بازگشت به لیست
            </Link>

            {submission.form && (
              <Link
                href={`/dashboard/forms/${submission.form._id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                مشاهده فرم اصلی
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
