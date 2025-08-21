"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaCogs,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
} from "react-icons/fa";

export default function ApprovalReasonsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [reasons, setReasons] = useState([]);
  const [filteredReasons, setFilteredReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [formData, setFormData] = useState({
    type: "approval",
    code: "",
    title: "",
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      fetchReasons();
    }
  }, [user]);

  useEffect(() => {
    filterReasons();
  }, [reasons, typeFilter]);

  // بررسی دسترسی
  if (
    !userLoading &&
    (!user || !["systemAdmin", "provinceTransferExpert"].includes(user.role))
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  const fetchReasons = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/transfer-settings/approval-reasons", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setReasons(data.reasons);
      } else {
        toast.error(data.error || "خطا در دریافت دلایل موافقت/مخالفت");
      }
    } catch (error) {
      console.error("Error fetching reasons:", error);
      toast.error("خطا در دریافت دلایل موافقت/مخالفت");
    } finally {
      setLoading(false);
    }
  };

  const filterReasons = () => {
    if (typeFilter === "all") {
      setFilteredReasons(reasons);
    } else {
      setFilteredReasons(
        reasons.filter((reason) => reason.type === typeFilter)
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.type || !formData.code.trim() || !formData.title.trim()) {
      toast.error("نوع، کد و عنوان الزامی است");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = "/api/transfer-settings/approval-reasons";
      const method = editingReason ? "PUT" : "POST";
      const payload = editingReason
        ? { ...formData, id: editingReason._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          editingReason
            ? "دلیل موافقت/مخالفت با موفقیت ویرایش شد"
            : "دلیل موافقت/مخالفت با موفقیت ایجاد شد"
        );
        fetchReasons();
        handleCloseModal();
      } else {
        toast.error(data.error || "خطا در عملیات");
      }
    } catch (error) {
      console.error("Error saving reason:", error);
      toast.error("خطا در ذخیره دلیل موافقت/مخالفت");
    }
  };

  const handleEdit = (reason) => {
    setEditingReason(reason);
    setFormData({
      type: reason.type,
      code: reason.code,
      title: reason.title,
      isActive: reason.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (reasonId) => {
    if (!confirm("آیا از حذف این دلیل موافقت/مخالفت اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/transfer-settings/approval-reasons?id=${reasonId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("دلیل موافقت/مخالفت با موفقیت حذف شد");
        fetchReasons();
      } else {
        toast.error(data.error || "خطا در حذف دلیل موافقت/مخالفت");
      }
    } catch (error) {
      console.error("Error deleting reason:", error);
      toast.error("خطا در حذف دلیل موافقت/مخالفت");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReason(null);
    setFormData({
      type: "approval",
      code: "",
      title: "",
      isActive: true,
    });
  };

  const getTypeText = (type) => {
    return type === "approval" ? "موافقت" : "مخالفت";
  };

  const getTypeIcon = (type) => {
    return type === "approval" ? (
      <FaCheckCircle className="h-3 w-3 ml-1" />
    ) : (
      <FaTimesCircle className="h-3 w-3 ml-1" />
    );
  };

  const getTypeColor = (type) => {
    return type === "approval"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Link
            href="/dashboard/transfer-settings"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaCogs className="h-6 w-6 text-purple-600" />
              مدیریت دلایل موافقت/مخالفت
            </h1>
            <p className="text-gray-600 mt-1">
              مدیریت دلایل موافقت یا مخالفت با درخواست‌های انتقال
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus />
          دلیل جدید
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              فیلتر بر اساس نوع:
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                typeFilter === "all"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setTypeFilter("approval")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                typeFilter === "approval"
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              موافقت
            </button>
            <button
              onClick={() => setTypeFilter("rejection")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                typeFilter === "rejection"
                  ? "bg-red-600 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              مخالفت
            </button>
          </div>
          <div className="text-sm text-gray-500">
            ({filteredReasons.length} مورد)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {filteredReasons.length === 0 ? (
            <div className="text-center py-8">
              <FaCogs className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {typeFilter === "all"
                  ? "هیچ دلیلی یافت نشد"
                  : `هیچ دلیل ${getTypeText(typeFilter)}ی یافت نشد`}
              </h3>
              <p className="text-gray-500">
                برای شروع، اولین دلیل موافقت/مخالفت را ایجاد کنید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-right">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      نوع
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      کد
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      عنوان دلیل
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      وضعیت
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReasons.map((reason) => (
                    <tr
                      key={reason._id}
                      className="border-b border-gray-100 hover:bg-gray-50 "
                    >
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                            reason.type
                          )}`}
                        >
                          {getTypeIcon(reason.type)}
                          {getTypeText(reason.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium text-right">
                        {reason.code}
                      </td>
                      <td className="py-3 px-4 text-gray-800 text-right">
                        {reason.title}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {reason.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheck className="h-3 w-3 ml-1" />
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FaTimes className="h-3 w-3 ml-1" />
                            غیرفعال
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleEdit(reason)}
                            className="text-blue-600 hover:text-blue-800 transition-colors text-right"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(reason._id)}
                            className="text-red-600 hover:text-red-800 transition-colors text-right"
                            title="حذف"
                          >
                            <FaTrash className="h-4 w-4" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingReason ? "ویرایش دلیل" : "دلیل جدید"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="approval">موافقت</option>
                    <option value="rejection">مخالفت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کد <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان دلیل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                    <span className="mr-2 text-sm text-gray-700">فعال</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                  >
                    {editingReason ? "ویرایش" : "ایجاد"}
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
