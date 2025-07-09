"use client";
import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";

const GenderManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [formData, setFormData] = useState({
    genderCode: "",
    genderTitle: "",
    isActive: true,
  });

  const [alert, setAlert] = useState({
    show: false,
    type: "",
    message: "",
  });

  useEffect(() => {
    fetchItems();
  }, [pagination.currentPage, searchTerm]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: "", message: "" }), 3000);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const searchParam = searchTerm
        ? `&search=${encodeURIComponent(searchTerm)}`
        : "";

      const response = await fetch(
        `/api/genders?page=${pagination.currentPage}&limit=10${searchParam}`
      );

      if (!response.ok) {
        throw new Error("خطا در دریافت اطلاعات");
      }

      const data = await response.json();
      setItems(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("خطا در دریافت داده‌ها:", error);
      showAlert("error", "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingItem
        ? `/api/genders/${editingItem._id}`
        : "/api/genders";

      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در ثبت اطلاعات");
      }

      showAlert("success", data.message);
      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error("خطا در ثبت:", error);
      showAlert("error", error.message || "خطا در ثبت اطلاعات");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      genderCode: item.genderCode,
      genderTitle: item.genderTitle,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این آیتم اطمینان دارید؟")) return;

    try {
      const response = await fetch(`/api/genders/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در حذف");
      }

      showAlert("success", data.message);
      fetchItems();
    } catch (error) {
      console.error("خطا در حذف:", error);
      showAlert("error", error.message || "خطا در حذف آیتم");
    }
  };

  const resetForm = () => {
    setFormData({
      genderCode: "",
      genderTitle: "",
      isActive: true,
    });
    setEditingItem(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">مدیریت جنسیت</h1>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در کد یا عنوان..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            <FiPlus />
            افزودن جنسیت جدید
          </button>
        </div>
      </div>

      {alert.show && (
        <div
          className={`p-4 rounded-lg ${
            alert.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد جنسیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عنوان جنسیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ایجاد کننده
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    داده‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.genderCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.genderTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.createdBy?.name || "نامشخص"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                          title="ویرایش"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="حذف"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                نمایش {(pagination.currentPage - 1) * 10 + 1} تا{" "}
                {Math.min(pagination.currentPage * 10, pagination.totalItems)}{" "}
                از {pagination.totalItems} مورد
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      currentPage: prev.currentPage - 1,
                    }))
                  }
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  قبلی
                </button>
                <span className="text-sm text-gray-700">
                  صفحه {pagination.currentPage} از {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      currentPage: prev.currentPage + 1,
                    }))
                  }
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  بعدی
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? "ویرایش جنسیت" : "افزودن جنسیت جدید"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کد جنسیت *
                </label>
                <input
                  type="text"
                  value={formData.genderCode}
                  onChange={(e) =>
                    setFormData({ ...formData, genderCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان جنسیت *
                </label>
                <input
                  type="text"
                  value={formData.genderTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, genderTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {editingItem && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="mr-2 text-sm text-gray-700">فعال</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingItem ? "به‌روزرسانی" : "ثبت"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenderManager;
