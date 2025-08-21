"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpersLoading, setHelpersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Default helpers data to prevent undefined errors
  const [helpers, setHelpers] = useState({
    provinces: [],
    districts: [],
    examCenters: [],
    districtsByProvince: {},
    examCentersByDistrict: {},
    targetRoles: [
      { value: "all", label: "همه کاربران" },
      { value: "systemAdmin", label: "مدیر سیستم" },
      { value: "generalManager", label: "مدیر کل" },
      { value: "examCenterManager", label: "مدیر واحد سازمانی" },
      { value: "provinceEducationExpert", label: "کارشناس سنجش استان" },
      { value: "provinceTechExpert", label: "کارشناس فناوری استان" },
      { value: "provinceEvalExpert", label: "کارشناس ارزیابی استان" },
      { value: "provinceRegistrationExpert", label: "کارشناس ثبت نام استان" },
      { value: "provinceTransferExpert", label: "کارشناس امور اداری استان" },
      { value: "districtEducationExpert", label: "کارشناس سنجش منطقه" },
      { value: "districtTechExpert", label: "کارشناس فناوری منطقه" },
      { value: "districtEvalExpert", label: "کارشناس ارزیابی منطقه" },
      { value: "districtRegistrationExpert", label: "کارشناس ثبت نام منطقه" },
      { value: "districtTransferExpert", label: "کارشناس امور اداری منطقه" },
      { value: "transferApplicant", label: "متقاضی انتقال" },
    ],
    priorities: [
      { value: "low", label: "کم", color: "gray" },
      { value: "medium", label: "متوسط", color: "blue" },
      { value: "high", label: "بالا", color: "orange" },
      { value: "critical", label: "حیاتی", color: "red" },
    ],
  });

  // در قسمت state ها، این موارد را اضافه کنید
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // فرم رویداد
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    organizationScope: "",
    targetRoles: [],
    targetProvinces: [],
    targetDistricts: [],
    targetExamCenters: [],
    priority: "medium",
    isActive: true,
  });

  // تابع فرمت کردن تاریخ فارسی
  const formatPersianDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateStr, timeStr };
  };

  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        setHelpersLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch("/api/events/helpers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setHelpers(data);
        } else {
          console.error("Error fetching helpers:", await response.text());
        }
      } catch (error) {
        console.error("Error in fetchHelpers:", error);
      } finally {
        setHelpersLoading(false);
      }
    };

    fetchHelpers();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentPage, searchTerm]);

  // Debug log برای helpers
  useEffect(() => {
    console.log("Helpers state updated:", helpers);
    console.log("Target roles:", helpers.targetRoles);
    console.log("Priorities:", helpers.priorities);
    console.log("Helpers loading:", helpersLoading);
  }, [helpers, helpersLoading]);

  const fetchHelpers = async () => {
    try {
      setHelpersLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/events/helpers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Helpers data received:", data); // Debug log
        setHelpers((prevHelpers) => ({
          ...prevHelpers, // Keep default values
          ...data, // Override with fetched data
        }));
      } else {
        console.error("Failed to fetch helpers:", response.status);
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
    } finally {
      setHelpersLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        admin: "true",
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/events?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const method = editingEvent ? "PUT" : "POST";
      const url = editingEvent
        ? `/api/events?id=${editingEvent._id}`
        : "/api/events";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(
          editingEvent
            ? "رویداد با موفقیت ویرایش شد"
            : "رویداد با موفقیت ایجاد شد"
        );
        setShowForm(false);
        setEditingEvent(null);
        resetForm();
        fetchEvents();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در ذخیره رویداد");
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
      organizationScope: event.organizationScope,
      targetRoles: event.targetRoles,
      targetProvinces: event.targetProvinces.map((p) => p._id),
      targetDistricts: event.targetDistricts.map((d) => d._id),
      targetExamCenters: event.targetExamCenters.map((e) => e._id),
      priority: event.priority,
      isActive: event.isActive,
    });

    // Set selected province and district if they exist
    if (event.targetProvinces.length > 0) {
      setSelectedProvince(event.targetProvinces[0]._id);
    }
    if (event.targetDistricts.length > 0) {
      setSelectedDistrict(event.targetDistricts[0]._id);
    }

    setShowForm(true);
  };

  const handleDelete = async (eventId) => {
    if (!confirm("آیا از حذف این رویداد مطمئن هستید؟")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("رویداد با موفقیت حذف شد");
        fetchEvents();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در حذف رویداد");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const resetForm = () => {
    console.log("Resetting form..."); // Debug log
    setFormData({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      organizationScope: "",
      targetRoles: [],
      targetProvinces: [],
      targetDistricts: [],
      targetExamCenters: [],
      priority: "medium",
      isActive: true,
    });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    console.log("Form reset completed"); // Debug log
  };

  const getStatusBadge = (statusInfo) => {
    const colorClasses = {
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      orange: "bg-orange-100 text-orange-800",
      red: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          colorClasses[statusInfo.color]
        }`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = helpers.priorities?.find(
      (p) => p.value === priority
    );
    if (!priorityConfig) {
      // fallback اولویت‌ها اگر helpers هنوز لود نشده
      const fallbackPriorities = {
        low: { label: "کم", color: "gray" },
        medium: { label: "متوسط", color: "blue" },
        high: { label: "بالا", color: "orange" },
        critical: { label: "حیاتی", color: "red" },
      };
      const fallback = fallbackPriorities[priority];
      if (!fallback) return priority;

      const colorClasses = {
        gray: "bg-gray-100 text-gray-800",
        blue: "bg-blue-100 text-blue-800",
        orange: "bg-orange-100 text-orange-800",
        red: "bg-red-100 text-red-800",
      };

      return (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            colorClasses[fallback.color]
          }`}
        >
          {fallback.label}
        </span>
      );
    }

    const colorClasses = {
      gray: "bg-gray-100 text-gray-800",
      blue: "bg-blue-100 text-blue-800",
      orange: "bg-orange-100 text-orange-800",
      red: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          colorClasses[priorityConfig.color]
        }`}
      >
        {priorityConfig.label}
      </span>
    );
  };

  if (loading && events.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">مدیریت رویدادها</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingEvent(null);
            resetForm();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus />
          رویداد جدید
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchEvents();
          }}
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="جستجو در عنوان، توضیحات یا حوزه مجری..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              <FaSearch />
              جستجو
            </button>
          </div>
        </form>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header with count */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              فهرست رویدادها
              {!loading && (
                <span className="text-sm text-gray-500 mr-2">
                  ({events.length} رویداد)
                </span>
              )}
            </h3>
            {helpersLoading && (
              <span className="text-sm text-blue-600">
                در حال بارگذاری اطلاعات کمکی...
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  عنوان
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  حوزه مجری
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  تاریخ شروع
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  تاریخ پایان
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  اولویت
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    <div className="font-medium">{event.title}</div>
                    {event.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {event.description.substring(0, 50)}
                        {event.description.length > 50 && "..."}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {event.organizationScope}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FaCalendarAlt className="text-gray-400" />
                      {(() => {
                        const { dateStr, timeStr } = formatPersianDateTime(
                          event.startDate
                        );
                        return (
                          <div>
                            <div>{dateStr}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {timeStr}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FaCalendarAlt className="text-gray-400" />
                      {(() => {
                        const { dateStr, timeStr } = formatPersianDateTime(
                          event.endDate
                        );
                        return (
                          <div>
                            <div>{dateStr}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {timeStr}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {getStatusBadge(event.statusInfo)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {getPriorityBadge(event.priority)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-blue-600 hover:text-blue-900"
                        title="ویرایش"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {events.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">هیچ رویدادی یافت نشد</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                صفحه {currentPage} از {totalPages}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEvent ? "ویرایش رویداد" : "ایجاد رویداد جدید"}
              </h3>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                key={`form-${helpersLoading}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان رویداد *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      حوزه مجری *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organizationScope}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizationScope: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاریخ و زمان شروع *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاریخ و زمان پایان *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اولویت
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={helpersLoading}
                    >
                      {helpersLoading ? (
                        <option>در حال بارگذاری...</option>
                      ) : (
                        helpers.priorities?.map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))
                      )}
                    </select>
                    {helpersLoading && (
                      <p className="text-xs text-gray-500 mt-1">
                        در حال بارگذاری اولویت‌ها...
                      </p>
                    )}
                  </div>

                  {/* Target Roles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      گروه هدف *
                    </label>
                    <select
                      multiple
                      value={formData.targetRoles}
                      onChange={(e) => {
                        const selectedRoles = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        setFormData({
                          ...formData,
                          targetRoles: selectedRoles,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={helpersLoading}
                    >
                      {helpersLoading ? (
                        <option>در حال بارگذاری...</option>
                      ) : (
                        helpers.targetRoles?.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))
                      )}
                    </select>
                    {helpersLoading && (
                      <p className="text-xs text-gray-500 mt-1">
                        در حال بارگذاری نقش‌ها...
                      </p>
                    )}
                  </div>

                  {/* Geographic Targeting - Only show if examCenterManager is selected */}
                  {formData.targetRoles.includes("examCenterManager") && (
                    <>
                      {/* Province Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          استان‌ها
                        </label>
                        <select
                          multiple
                          value={formData.targetProvinces}
                          onChange={(e) => {
                            const selectedProvinces = Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            );
                            setFormData({
                              ...formData,
                              targetProvinces: selectedProvinces,
                              // Reset districts and exam centers when provinces change
                              targetDistricts: [],
                              targetExamCenters: [],
                            });
                            setSelectedProvince(
                              selectedProvinces[selectedProvinces.length - 1]
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={helpersLoading}
                        >
                          {helpersLoading ? (
                            <option>در حال بارگذاری...</option>
                          ) : (
                            helpers.provinces?.map((province) => (
                              <option key={province._id} value={province._id}>
                                {province.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* District Selection - Only show if a province is selected */}
                      {selectedProvince && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مناطق
                          </label>
                          <select
                            multiple
                            value={formData.targetDistricts}
                            onChange={(e) => {
                              const selectedDistricts = Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                              );
                              setFormData({
                                ...formData,
                                targetDistricts: selectedDistricts,
                                // Reset exam centers when districts change
                                targetExamCenters: [],
                              });
                              setSelectedDistrict(
                                selectedDistricts[selectedDistricts.length - 1]
                              );
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={helpersLoading}
                          >
                            {helpersLoading ? (
                              <option>در حال بارگذاری...</option>
                            ) : (
                              helpers.districtsByProvince[
                                selectedProvince
                              ]?.map((district) => (
                                <option key={district._id} value={district._id}>
                                  {district.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}

                      {/* Exam Center Selection - Only show if a district is selected */}
                      {selectedDistrict && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            واحدهای سازمانی
                          </label>
                          <select
                            multiple
                            value={formData.targetExamCenters}
                            onChange={(e) => {
                              const selectedCenters = Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                              );
                              setFormData({
                                ...formData,
                                targetExamCenters: selectedCenters,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={helpersLoading}
                          >
                            {helpersLoading ? (
                              <option>در حال بارگذاری...</option>
                            ) : (
                              helpers.examCentersByDistrict[
                                selectedDistrict
                              ]?.map((center) => (
                                <option key={center._id} value={center._id}>
                                  {center.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="mr-2 block text-sm text-gray-900"
                  >
                    رویداد فعال است
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEvent(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingEvent ? "ویرایش" : "ایجاد"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
