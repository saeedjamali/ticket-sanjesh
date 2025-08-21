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
  FaExchangeAlt,
  FaSortUp,
  FaSortDown,
  FaFileUpload,
  FaCheckCircle,
} from "react-icons/fa";

export default function TransferReasonsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    reasonCode: "",
    reasonTitle: "",
    requiresAdminApproval: false,
    description: "",
    order: 0,
    requiresDocumentUpload: false,
    requiredDocumentsCount: 0,
    hasYearsLimit: false,
    yearsLimit: "",
    isCulturalCouple: false,
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      fetchReasons();
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

  const fetchReasons = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/transfer-settings/transfer-reasons", {
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
        toast.error(data.error || "خطا در دریافت علل انتقال");
      }
    } catch (error) {
      console.error("Error fetching reasons:", error);
      toast.error("خطا در دریافت علل انتقال");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.code.trim() ||
      !formData.title.trim() ||
      !formData.reasonCode.trim() ||
      !formData.reasonTitle.trim()
    ) {
      toast.error("کد، عنوان، کد علت و عنوان علت الزامی است");
      return;
    }

    // اعتبارسنجی تعداد مستندات
    if (
      formData.requiresDocumentUpload &&
      formData.requiredDocumentsCount < 1
    ) {
      toast.error("در صورت نیاز به مستندات، تعداد باید حداقل 1 باشد");
      return;
    }

    // اعتبارسنجی محدودیت سنوات
    if (
      formData.hasYearsLimit &&
      (!formData.yearsLimit || formData.yearsLimit < 1)
    ) {
      toast.error(
        "در صورت فعال بودن محدودیت سنوات، مقدار سنوات باید حداقل 1 باشد"
      );
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = "/api/transfer-settings/transfer-reasons";
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
            ? "علت انتقال با موفقیت ویرایش شد"
            : "علت انتقال با موفقیت ایجاد شد"
        );
        fetchReasons();
        handleCloseModal();
      } else {
        toast.error(data.error || "خطا در عملیات");
      }
    } catch (error) {
      console.error("Error saving reason:", error);
      toast.error("خطا در ذخیره علت انتقال");
    }
  };

  const handleEdit = (reason) => {
    setEditingReason(reason);
    setFormData({
      code: reason.code,
      title: reason.title,
      reasonCode: reason.reasonCode,
      reasonTitle: reason.reasonTitle,
      requiresAdminApproval: reason.requiresAdminApproval,
      description: reason.description || "",
      order: reason.order,
      requiresDocumentUpload: reason.requiresDocumentUpload,
      requiredDocumentsCount: reason.requiredDocumentsCount,
      hasYearsLimit: reason.hasYearsLimit || false,
      yearsLimit: reason.yearsLimit || "",
      isCulturalCouple: reason.isCulturalCouple || false,
      isActive: reason.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (reasonId) => {
    if (!confirm("آیا از حذف این علت انتقال اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/transfer-settings/transfer-reasons?id=${reasonId}`,
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
        toast.success("علت انتقال با موفقیت حذف شد");
        fetchReasons();
      } else {
        toast.error(data.error || "خطا در حذف علت انتقال");
      }
    } catch (error) {
      console.error("Error deleting reason:", error);
      toast.error("خطا در حذف علت انتقال");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReason(null);
    setFormData({
      code: "",
      title: "",
      reasonCode: "",
      reasonTitle: "",
      requiresAdminApproval: false,
      description: "",
      order: 0,
      requiresDocumentUpload: false,
      requiredDocumentsCount: 0,
      hasYearsLimit: false,
      yearsLimit: "",
      isCulturalCouple: false,
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
              <FaExchangeAlt className="h-6 w-6 text-green-600" />
              مدیریت علل انتقال
            </h1>
            <p className="text-gray-600 mt-1">
              مدیریت علل و دلایل مختلف انتقال دانش‌آموزان
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus />
          علت انتقال جدید
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {reasons.length === 0 ? (
            <div className="text-center py-8">
              <FaExchangeAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                هیچ علت انتقالی یافت نشد
              </h3>
              <p className="text-gray-500">
                برای شروع، اولین علت انتقال را ایجاد کنید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      ترتیب
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      کد
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      عنوان
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      کد علت
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      عنوان علت
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      تایید اداری
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      مستندات
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      محدودیت سنوات
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      زوج فرهنگی
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
                  {reasons.map((reason) => (
                    <tr
                      key={reason._id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-800 font-medium text-right">
                        <div className="flex items-center justify-center">
                          <FaSortUp className="h-3 w-3 text-gray-400 mr-1" />
                          {reason.order}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium text-right">
                        {reason.code}
                      </td>
                      <td className="py-3 px-4 text-gray-800 text-right">
                        {reason.title}
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium text-right">
                        {reason.reasonCode}
                      </td>
                      <td className="py-3 px-4 text-gray-800 text-right">
                        {reason.reasonTitle}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {reason.requiresAdminApproval ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <FaCheckCircle className="h-3 w-3 ml-1" />
                            نیاز دارد
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FaTimes className="h-3 w-3 ml-1" />
                            ندارد
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {reason.requiresDocumentUpload ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <FaFileUpload className="h-3 w-3 ml-1" />
                            {reason.requiredDocumentsCount} مستند
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FaTimes className="h-3 w-3 ml-1" />
                            ندارد
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {reason.hasYearsLimit ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <FaCheckCircle className="h-3 w-3 ml-1" />
                            {reason.yearsLimit} سال
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FaTimes className="h-3 w-3 ml-1" />
                            ندارد
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {reason.isCulturalCouple ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            <FaCheckCircle className="h-3 w-3 ml-1" />
                            بله
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FaTimes className="h-3 w-3 ml-1" />
                            خیر
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
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
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleEdit(reason)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(reason._id)}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingReason ? "ویرایش علت انتقال" : "علت انتقال جدید"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد علت <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reasonCode}
                      onChange={(e) =>
                        setFormData({ ...formData, reasonCode: e.target.value })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      عنوان علت <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reasonTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reasonTitle: e.target.value,
                        })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ترتیب نمایش
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          order: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تعداد مستندات مورد نیاز
                    </label>
                    <input
                      type="number"
                      value={formData.requiredDocumentsCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiredDocumentsCount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      min="0"
                      disabled={!formData.requiresDocumentUpload}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.requiresAdminApproval}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requiresAdminApproval: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">
                        نیاز به تایید اداره دارد
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.requiresDocumentUpload}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requiresDocumentUpload: e.target.checked,
                            requiredDocumentsCount: e.target.checked
                              ? formData.requiredDocumentsCount
                              : 0,
                          })
                        }
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">
                        نیاز به بارگذاری مستندات دارد
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.hasYearsLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hasYearsLimit: e.target.checked,
                            yearsLimit: e.target.checked
                              ? formData.yearsLimit
                              : "",
                          })
                        }
                        className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">
                        محدودیت سنوات دارد
                      </span>
                    </label>
                  </div>

                  {formData.hasYearsLimit && (
                    <div className="mr-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        سنوات (سال) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.yearsLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            yearsLimit: parseInt(e.target.value) || "",
                          })
                        }
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        min="1"
                        placeholder="تعداد سال محدودیت"
                      />
                    </div>
                  )}

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isCulturalCouple}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isCulturalCouple: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-pink-600 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">
                        زوج فرهنگی است
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">فعال</span>
                    </label>
                  </div>
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
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
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
