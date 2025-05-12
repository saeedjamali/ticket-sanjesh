"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user } = useUserContext();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);

  // Check if user can manage announcements
  const canManageAnnouncements =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
    ].includes(user.role);

  useEffect(() => {
    if (user) {
      fetchAnnouncementDetails();
    }
  }, [id, user]);

  const fetchAnnouncementDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/announcements/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("اطلاعیه مورد نظر یافت نشد");
        }
        throw new Error(`خطای دریافت اطلاعیه: ${response.status}`);
      }

      const data = await response.json();
      console.log("data----->", data);
      if (data.success) {
        setAnnouncement(data.announcement);
      } else {
        throw new Error(data.message || "خطا در دریافت اطلاعیه");
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("آیا از حذف این اطلاعیه اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("اطلاعیه با موفقیت حذف شد");
        router.push("/dashboard/announcements");
      } else {
        toast.error(data.message || "خطا در حذف اطلاعیه");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("خطا در حذف اطلاعیه");
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      if (!announcement) return;

      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          ...announcement,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnnouncement({ ...announcement, status: newStatus });
        toast.success(
          `وضعیت اطلاعیه با موفقیت به ${getStatusText(newStatus)} تغییر کرد`
        );
      } else {
        toast.error(data.message || "خطا در بروزرسانی وضعیت اطلاعیه");
      }
    } catch (error) {
      console.error("Error updating announcement status:", error);
      toast.error("خطا در بروزرسانی وضعیت اطلاعیه");
    }
  };

  const getImage = async () => {
    try {
      if (!announcement?.imageUrl) return;

      // If image URL is a complete URL, use it directly
      if (announcement.imageUrl.startsWith("http")) {
        setImageUrl(announcement.imageUrl);
        setShowImage(true);
        return;
      }

      // Otherwise, fetch the image from the server
      const imagePath = announcement.imageUrl.startsWith("/uploads/")
        ? announcement.imageUrl.substring(9) // Remove the /uploads/ prefix
        : announcement.imageUrl;

      const response = await fetch(`/api/announcements/getimg/${imagePath}`);

      if (!response.ok) {
        throw new Error("خطا در دریافت تصویر");
      }

      // Get the image as a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setShowImage(true);
    } catch (error) {
      console.error("Error fetching image:", error);
      toast.error("خطا در دریافت تصویر");
    }
  };

  const downloadImage = async () => {
    try {
      if (!imageUrl) return;

      // Create a download link
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `announcement-image-${id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("خطا در دانلود تصویر");
    }
  };

  const hideImage = () => {
    setShowImage(false);
  };

  // Helper functions for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "آنی";
      case "medium":
        return "فوری";
      case "low":
        return "عادی";
      default:
        return priority;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "فعال";
      case "inactive":
        return "غیرفعال";
      case "archived":
        return "بایگانی";
      default:
        return status;
    }
  };

  const getTargetRoleLabel = (role) => {
    const roles = {
      districtEducationExpert: "کارشناس سنجش منطقه",
      districtTechExpert: "کارشناس فناوری منطقه",
      examCenterManager: "مسئول مرکز آزمون",
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-red-100 border-r-4 border-red-500 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        <Link
          href="/dashboard/announcements"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          بازگشت به لیست اطلاعیه‌ها
        </Link>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-yellow-100 border-r-4 border-yellow-500 p-4 rounded mb-4">
          <p className="text-yellow-700">اطلاعیه مورد نظر یافت نشد.</p>
        </div>
        <Link
          href="/dashboard/announcements"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          بازگشت به لیست اطلاعیه‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <Link
            href="/dashboard/announcements"
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">مشاهده اطلاعیه</h1>
        </div>
        {canManageAnnouncements && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/announcements/${id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              ویرایش
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              حذف
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            {/* Announcement header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {announcement.title}
                </h2>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="ml-2">
                    تاریخ انتشار: {formatDate(announcement.createdAt)}
                  </span>
                  {announcement.updatedAt &&
                    announcement.updatedAt !== announcement.createdAt && (
                      <span className="mr-4">
                        آخرین بروزرسانی: {formatDate(announcement.updatedAt)}
                      </span>
                    )}
                </div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeClass(
                    announcement.priority
                  )}`}
                >
                  {getPriorityText(announcement.priority)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    announcement.status === "active"
                      ? "bg-green-100 text-green-800"
                      : announcement.status === "inactive"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {getStatusText(announcement.status)}
                </span>
              </div>
            </div>

            {/* Target groups */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                گروه‌های هدف:
              </h3>
              <div className="flex flex-wrap gap-2">
                {announcement.targetRoles.map((role) => (
                  <span
                    key={role}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs"
                  >
                    {getTargetRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>

            {/* Target districts */}
            {announcement.targetDistricts &&
              announcement.targetDistricts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    مناطق هدف:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {announcement.targetDistricts.map((district) => (
                      <span
                        key={district._id}
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs"
                      >
                        {district.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Announcement content */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                متن اطلاعیه:
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-800">
                {announcement.content}
              </div>
            </div>
          </div>

          {/* Right column - image and actions */}
          <div className="md:w-1/3">
            {announcement.imageUrl && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  تصویر اطلاعیه:
                </h3>

                {!showImage ? (
                  <div className="flex items-center justify-center bg-gray-50 p-4 rounded-lg">
                    <button
                      onClick={getImage}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      نمایش تصویر
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <img
                        src={imageUrl}
                        alt={announcement.title}
                        className="w-full h-auto object-contain max-h-64"
                      />
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={downloadImage}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        دانلود تصویر
                      </button>
                      <button
                        onClick={hideImage}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        بستن تصویر
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canManageAnnouncements && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium text-gray-700">
                  مدیریت وضعیت:
                </h3>
                {announcement.status !== "active" && (
                  <button
                    onClick={() => updateStatus("active")}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    فعال کردن
                  </button>
                )}
                {announcement.status !== "inactive" && (
                  <button
                    onClick={() => updateStatus("inactive")}
                    className="w-full flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
                  >
                    غیرفعال کردن
                  </button>
                )}
                {announcement.status !== "archived" && (
                  <button
                    onClick={() => updateStatus("archived")}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                  >
                    بایگانی کردن
                  </button>
                )}
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                اطلاعات انتشار:
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <div className="mb-2">
                  <span className="font-medium">ایجاد کننده:</span>{" "}
                  {announcement.createdBy?.fullName || "نامشخص"}
                </div>
                <div className="mb-2">
                  <span className="font-medium">استان:</span>{" "}
                  {announcement.province?.name || "نامشخص"}
                </div>
                <div>
                  <span className="font-medium">تعداد بازدید:</span>{" "}
                  {announcement.viewedBy?.length || 0} نفر
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
