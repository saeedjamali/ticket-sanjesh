"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { ROLES } from "@/lib/permissions";
import { toast } from "react-hot-toast";

export default function AnnouncementsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("active");
  const [selectedItems, setSelectedItems] = useState([]);

  // Determine if user can create/manage announcements
  const canManageAnnouncements =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
    ].includes(user.role);

  useEffect(() => {
    if (user) {
      fetchAnnouncements(currentPage, filter);
    }
  }, [currentPage, filter, user]);

  const fetchAnnouncements = async (page = 1, status = "active") => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = `/api/announcements?page=${page}&status=${status}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت اطلاعیه‌ها: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnnouncements(data.announcements);
        setTotalPages(data.pagination.pages || 1);
      } else {
        throw new Error(data.message || "خطا در دریافت اطلاعیه‌ها");
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id) => {
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
        fetchAnnouncements(currentPage, filter); // Refresh the list
      } else {
        toast.error(data.message || "خطا در حذف اطلاعیه");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("خطا در حذف اطلاعیه");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const announcement = announcements.find((a) => a._id === id);

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
        toast.success(
          `وضعیت اطلاعیه با موفقیت به ${getStatusText(newStatus)} تغییر کرد`
        );
        fetchAnnouncements(currentPage, filter); // Refresh the list
      } else {
        toast.error(data.message || "خطا در بروزرسانی وضعیت اطلاعیه");
      }
    } catch (error) {
      console.error("Error updating announcement status:", error);
      toast.error("خطا در بروزرسانی وضعیت اطلاعیه");
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fa-IR");
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to get priority text
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

  // Helper function to get priority badge class
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "high":
        return "badge-danger";
      case "medium":
        return "badge-warning";
      case "low":
        return "badge-info";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Helper function to get status text
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

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">مدیریت اطلاعیه‌ها</h1>
        {canManageAnnouncements && (
          <Link
            href="/dashboard/announcements/create"
            className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>ایجاد اطلاعیه جدید</span>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center">
            <label htmlFor="filter" className="ml-2 text-sm font-medium">
              وضعیت:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={handleFilterChange}
              className="rounded-md border border-gray-300 px-3 py-1"
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="archived">بایگانی شده</option>
            </select>
          </div>

          {canManageAnnouncements && selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  selectedItems.forEach((id) => updateStatus(id, "inactive"));
                  setSelectedItems([]);
                }}
                className="px-3 py-1 bg-amber-100 text-amber-800 rounded-md text-sm hover:bg-amber-200"
              >
                غیرفعال کردن ({selectedItems.length})
              </button>
              <button
                onClick={() => {
                  selectedItems.forEach((id) => updateStatus(id, "archived"));
                  setSelectedItems([]);
                }}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm hover:bg-purple-200"
              >
                بایگانی کردن ({selectedItems.length})
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `آیا از حذف ${selectedItems.length} اطلاعیه انتخاب شده اطمینان دارید؟`
                    )
                  ) {
                    selectedItems.forEach((id) => handleDelete(id));
                    setSelectedItems([]);
                  }
                }}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
              >
                حذف ({selectedItems.length})
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              هیچ اطلاعیه‌ای یافت نشد!
            </h3>
            <p className="text-gray-500 mb-6">
              در این بخش هیچ اطلاعیه‌ای با وضعیت {getStatusText(filter)} وجود
              ندارد.
            </p>
            {canManageAnnouncements && (
              <Link
                href="/dashboard/announcements/create"
                className="btn-primary"
              >
                ایجاد اطلاعیه جدید
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {canManageAnnouncements && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={
                            selectedItems.length === announcements.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(announcements.map((a) => a._id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </th>
                    )}
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      عنوان
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      فوریت
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      گروه هدف
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      تاریخ ایجاد
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      وضعیت
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {announcements.map((announcement) => (
                    <tr key={announcement._id} className="hover:bg-gray-50">
                      {canManageAnnouncements && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            checked={selectedItems.includes(announcement._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([
                                  ...selectedItems,
                                  announcement._id,
                                ]);
                              } else {
                                setSelectedItems(
                                  selectedItems.filter(
                                    (id) => id !== announcement._id
                                  )
                                );
                              }
                            }}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {announcement.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {announcement.content.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(
                            announcement.priority
                          )}`}
                        >
                          {getPriorityText(announcement.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center gap-1">
                          {announcement.targetRoles.includes(
                            "districtEducationExpert"
                          ) && (
                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                              کارشناس سنجش منطقه
                            </span>
                          )}
                          {announcement.targetRoles.includes(
                            "districtTechExpert"
                          ) && (
                            <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                              کارشناس فناوری منطقه
                            </span>
                          )}
                          {announcement.targetRoles.includes(
                            "examCenterManager"
                          ) && (
                            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                              مسئول مرکز آزمون
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {formatDate(announcement.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            announcement.status === "active"
                              ? "bg-green-100 text-green-800"
                              : announcement.status === "inactive"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {getStatusText(announcement.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2 space-x-reverse">
                          <Link
                            href={`/dashboard/announcements/${announcement._id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            مشاهده
                          </Link>
                          {canManageAnnouncements && (
                            <>
                              <span className="text-gray-300">|</span>
                              <Link
                                href={`/dashboard/announcements/${announcement._id}/edit`}
                                className="text-amber-600 hover:text-amber-900"
                              >
                                ویرایش
                              </Link>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDelete(announcement._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                حذف
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">قبلی</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`${
                        currentPage === i + 1
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      } relative inline-flex items-center px-4 py-2 border text-sm font-medium`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">بعدی</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
