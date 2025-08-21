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
  FaClipboard,
} from "react-icons/fa";

export default function PreliminaryNoticesPage() {
  const { user, loading: userLoading } = useUserContext();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      fetchNotices();
    }
  }, [user]);

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

  const fetchNotices = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        "/api/transfer-settings/preliminary-notices",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotices(data.notices);
      } else {
        toast.error(data.error || "خطا در دریافت تذکرات");
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
      toast.error("خطا در دریافت تذکرات");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.title.trim()) {
      toast.error("کد و عنوان الزامی است");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = editingNotice
        ? "/api/transfer-settings/preliminary-notices"
        : "/api/transfer-settings/preliminary-notices";

      const method = editingNotice ? "PUT" : "POST";
      const payload = editingNotice
        ? { ...formData, id: editingNotice._id }
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
          editingNotice ? "تذکر با موفقیت ویرایش شد" : "تذکر با موفقیت ایجاد شد"
        );
        fetchNotices();
        handleCloseModal();
      } else {
        toast.error(data.error || "خطا در عملیات");
      }
    } catch (error) {
      console.error("Error saving notice:", error);
      toast.error("خطا در ذخیره تذکر");
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      code: notice.code,
      title: notice.title,
      isActive: notice.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (noticeId) => {
    if (!confirm("آیا از حذف این تذکر اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/transfer-settings/preliminary-notices?id=${noticeId}`,
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
        toast.success("تذکر با موفقیت حذف شد");
        fetchNotices();
      } else {
        toast.error(data.error || "خطا در حذف تذکر");
      }
    } catch (error) {
      console.error("Error deleting notice:", error);
      toast.error("خطا در حذف تذکر");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNotice(null);
    setFormData({
      code: "",
      title: "",
      isActive: true,
    });
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
              <FaClipboard className="h-6 w-6 text-blue-600" />
              مدیریت تذکرات اولیه
            </h1>
            <p className="text-gray-600 mt-1">
              مدیریت کدها و عناوین تذکرات اولیه سیستم انتقال
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus />
          تذکر جدید
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {notices.length === 0 ? (
            <div className="text-center py-8">
              <FaClipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                هیچ تذکری یافت نشد
              </h3>
              <p className="text-gray-500">
                برای شروع، اولین تذکر اولیه را ایجاد کنید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      کد
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      عنوان
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
                  {notices.map((notice) => (
                    <tr
                      key={notice._id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-800 font-medium text-right">
                        {notice.code}
                      </td>
                      <td className="py-3 px-4 text-gray-800 text-right">
                        {notice.title}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {notice.isActive ? (
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
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleEdit(notice)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(notice._id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
                {editingNotice ? "ویرایش تذکر" : "تذکر جدید"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    {editingNotice ? "ویرایش" : "ایجاد"}
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
