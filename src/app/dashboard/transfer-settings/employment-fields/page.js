"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFileExcel,
  FaDownload,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimes,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaBriefcase,
  FaCode,
  FaInfoCircle,
  FaCalendarAlt,
  FaUser,
} from "react-icons/fa";
import * as XLSX from "xlsx";

export default function EmploymentFieldsPage() {
  const { user, userLoading } = useUser();
  const [employmentFields, setEmploymentFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [selectedField, setSelectedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // State برای فرم
  const [formData, setFormData] = useState({
    fieldCode: "",
    title: "",
    description: "",
    isActive: true,
    isShared: false,
  });

  // State برای pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // State برای انتخاب گروهی
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // State برای import Excel
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  // دریافت لیست رشته‌های استخدامی
  const fetchEmploymentFields = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        includeInactive: includeInactive.toString(),
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/employment-fields?${params}`);
      const data = await response.json();

      if (data.success) {
        setEmploymentFields(data.data);
        setTotalItems(data.pagination.total);
      } else {
        toast.error(data.error || "خطا در دریافت اطلاعات");
      }
    } catch (error) {
      console.error("Error fetching employment fields:", error);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // بارگذاری اولیه
  useEffect(() => {
    if (user && !userLoading) {
      fetchEmploymentFields();
    }
  }, [user, userLoading, currentPage, itemsPerPage, includeInactive]);

  // جستجو با تاخیر
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (user && !userLoading) {
        setCurrentPage(1);
        fetchEmploymentFields();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // باز کردن مدال ایجاد
  const handleCreate = () => {
    setModalMode("create");
    setSelectedField(null);
    setFormData({
      fieldCode: "",
      title: "",
      description: "",
      isActive: true,
      isShared: false,
    });
    setShowModal(true);
  };

  // باز کردن مدال ویرایش
  const handleEdit = (field) => {
    setModalMode("edit");
    setSelectedField(field);
    setFormData({
      fieldCode: field.fieldCode,
      title: field.title,
      description: field.description || "",
      isActive: field.isActive,
      isShared: field.isShared || false,
    });
    setShowModal(true);
  };

  // تغییر مقادیر فرم
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ذخیره فرم
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = "/api/employment-fields";
      const method = modalMode === "create" ? "POST" : "PUT";
      const body =
        modalMode === "edit"
          ? { ...formData, id: selectedField._id }
          : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowModal(false);
        fetchEmploymentFields();
      } else {
        toast.error(data.error || "خطا در ذخیره اطلاعات");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("خطا در ذخیره اطلاعات");
    } finally {
      setSubmitting(false);
    }
  };

  // حذف رشته
  const handleDelete = async (field) => {
    if (!confirm(`آیا از حذف رشته "${field.title}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/employment-fields?id=${field._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchEmploymentFields();
      } else {
        toast.error(data.error || "خطا در حذف");
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      toast.error("خطا در حذف");
    }
  };

  // انتخاب همه
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(employmentFields.map((field) => field._id)));
    }
    setSelectAll(!selectAll);
  };

  // انتخاب تک مورد
  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === employmentFields.length);
  };

  // عملیات گروهی - فعال/غیرفعال
  const handleBulkToggleActive = async (makeActive) => {
    if (selectedItems.size === 0) {
      toast.error("لطفاً حداقل یک مورد انتخاب کنید");
      return;
    }

    const action = makeActive ? "فعال" : "غیرفعال";
    if (
      !confirm(
        `آیا از ${action} کردن ${selectedItems.size} مورد انتخاب شده اطمینان دارید؟`
      )
    ) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map((id) => {
        const field = employmentFields.find((f) => f._id === id);
        return fetch("/api/employment-fields", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: field._id,
            fieldCode: field.fieldCode,
            title: field.title,
            description: field.description,
            isActive: makeActive,
          }),
        });
      });

      await Promise.all(promises);
      toast.success(`${selectedItems.size} مورد با موفقیت ${action} شد`);
      setSelectedItems(new Set());
      setSelectAll(false);
      fetchEmploymentFields();
    } catch (error) {
      console.error("Error in bulk operation:", error);
      toast.error("خطا در انجام عملیات گروهی");
    }
  };

  // حذف گروهی
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error("لطفاً حداقل یک مورد انتخاب کنید");
      return;
    }

    if (
      !confirm(
        `آیا از حذف ${selectedItems.size} مورد انتخاب شده اطمینان دارید؟`
      )
    ) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map((id) =>
        fetch(`/api/employment-fields?id=${id}`, { method: "DELETE" })
      );

      await Promise.all(promises);
      toast.success(`${selectedItems.size} مورد با موفقیت حذف شد`);
      setSelectedItems(new Set());
      setSelectAll(false);
      fetchEmploymentFields();
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast.error("خطا در حذف گروهی");
    }
  };

  // خروجی Excel
  const handleExportExcel = () => {
    const exportData = employmentFields.map((field) => ({
      "کد رشته": field.fieldCode,
      "عنوان رشته": field.title,
      توضیحات: field.description || "",
      مشترک: field.isShared ? "بله" : "خیر",
      وضعیت: field.isActive ? "فعال" : "غیرفعال",
      "تاریخ ایجاد": new Date(field.createdAt).toLocaleDateString("fa-IR"),
      ایجادکننده: field.createdBy
        ? `${field.createdBy.firstName} ${field.createdBy.lastName}`
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "رشته‌های استخدامی");
    XLSX.writeFile(
      wb,
      `employment-fields-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("فایل Excel با موفقیت دانلود شد");
  };

  // پردازش فایل Excel
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // تبدیل به فرمت مورد نیاز
        const processedData = jsonData.map((row, index) => ({
          row: index + 1,
          fieldCode: row["کد رشته"] || row["fieldCode"] || "",
          title: row["عنوان رشته"] || row["title"] || "",
          description: row["توضیحات"] || row["description"] || "",
          isShared:
            row["مشترک"] === "بله" ||
            row["isShared"] === true ||
            row["isShared"] === "true",
          isActive:
            row["وضعیت"] === "فعال" ||
            row["isActive"] === true ||
            row["isActive"] === "true",
          valid: true,
          error: "",
        }));

        // اعتبارسنجی
        processedData.forEach((item) => {
          if (!item.fieldCode || !item.title) {
            item.valid = false;
            item.error = "کد رشته و عنوان الزامی است";
          } else if (!/^\d+$/.test(item.fieldCode)) {
            item.valid = false;
            item.error = "کد رشته باید فقط شامل اعداد باشد";
          }
        });

        setExcelData(processedData);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        toast.error("خطا در خواندن فایل Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // import از Excel
  const handleImportExcel = async () => {
    const validData = excelData.filter((item) => item.valid);
    if (validData.length === 0) {
      toast.error("هیچ داده معتبری برای import وجود ندارد");
      return;
    }

    setImportLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of validData) {
        try {
          const response = await fetch("/api/employment-fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fieldCode: item.fieldCode,
              title: item.title,
              description: item.description,
              isActive: item.isActive,
              isShared: item.isShared,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      toast.success(`${successCount} مورد با موفقیت import شد`);
      if (errorCount > 0) {
        toast.error(`${errorCount} مورد با خطا مواجه شد`);
      }

      setShowExcelModal(false);
      setExcelData([]);
      setExcelFile(null);
      fetchEmploymentFields();
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("خطا در import اطلاعات");
    } finally {
      setImportLoading(false);
    }
  };

  // محاسبه pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  if (!user || !["systemAdmin", "provinceTransferExpert"].includes(user.role)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <FaTimes className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">عدم دسترسی</h2>
          <p className="text-gray-600">شما به این بخش دسترسی ندارید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-3 rounded-lg">
              <FaBriefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مدیریت رشته‌های استخدامی</h1>
              <p className="text-blue-100 text-sm">
                افزودن، ویرایش و مدیریت رشته‌های استخدامی سیستم
              </p>
            </div>
          </div>
        </div>

        {/* فیلترها و عملیات */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* جستجو */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="جستجو در کد، عنوان یا توضیحات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* فیلترها */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                نمایش غیرفعال‌ها
              </label>

              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={10}>10 مورد</option>
                <option value={20}>20 مورد</option>
                <option value={50}>50 مورد</option>
              </select>
            </div>

            {/* دکمه‌های عملیات */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <FaPlus className="h-4 w-4" />
                افزودن رشته
              </button>

              <button
                onClick={() => setShowExcelModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <FaUpload className="h-4 w-4" />
                Import Excel
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <FaDownload className="h-4 w-4" />
                Export Excel
              </button>
            </div>
          </div>

          {/* عملیات گروهی */}
          {selectedItems.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">
                  {selectedItems.size} مورد انتخاب شده
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkToggleActive(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    فعال کردن
                  </button>
                  <button
                    onClick={() => handleBulkToggleActive(false)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                  >
                    غیرفعال کردن
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* جدول */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-2xl text-blue-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      کد رشته
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عنوان رشته
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      توضیحات
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      مشترک
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ ایجاد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ایجادکننده
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employmentFields.map((field) => (
                    <tr
                      key={field._id}
                      className={`hover:bg-gray-50 ${
                        selectedItems.has(field._id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(field._id)}
                          onChange={() => handleSelectItem(field._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaCode className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {field.fieldCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {field.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {field.description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {field.isShared ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheckCircle className="h-3 w-3 mr-1" />
                            مشترک
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FaTimes className="h-3 w-3 mr-1" />
                            جنسیتی
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            field.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {field.isActive ? (
                            <>
                              <FaCheckCircle className="h-3 w-3 mr-1" />
                              فعال
                            </>
                          ) : (
                            <>
                              <FaTimes className="h-3 w-3 mr-1" />
                              غیرفعال
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <FaCalendarAlt className="h-3 w-3" />
                          {new Date(field.createdAt).toLocaleDateString(
                            "fa-IR"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <FaUser className="h-3 w-3" />
                          {field.createdBy
                            ? `${field.createdBy.firstName} ${field.createdBy.lastName}`
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(field)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(field)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    نمایش {(currentPage - 1) * itemsPerPage + 1} تا{" "}
                    {Math.min(currentPage * itemsPerPage, totalItems)} از{" "}
                    {totalItems} مورد
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaAngleDoubleRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">
                      {currentPage} از {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaAngleDoubleLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {employmentFields.length === 0 && !loading && (
              <div className="text-center py-12">
                <FaInfoCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  هیچ رشته‌ای یافت نشد
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "جستجوی شما نتیجه‌ای نداشت"
                    : "هنوز رشته استخدامی اضافه نشده است"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* مدال ایجاد/ویرایش */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === "create" ? "افزودن رشته جدید" : "ویرایش رشته"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کد رشته *
                  </label>
                  <input
                    type="text"
                    name="fieldCode"
                    value={formData.fieldCode}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]+"
                    title="فقط عدد وارد کنید"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="مثال: 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان رشته *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="مثال: پزشکی عمومی"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="توضیحات اختیاری..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        فعال
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isShared"
                        checked={formData.isShared}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        مشترک (جنسیت مهم نیست)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <FaSpinner className="animate-spin h-4 w-4" />}
                  {modalMode === "create" ? "افزودن" : "ذخیره"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال Import Excel */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Import از Excel
              </h3>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelData([]);
                  setExcelFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* انتخاب فایل */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  انتخاب فایل Excel
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={() => {
                      // دانلود نمونه فایل
                      const sampleData = [
                        {
                          "کد رشته": "101",
                          "عنوان رشته": "پزشکی عمومی",
                          توضیحات: "رشته پزشکی عمومی",
                          مشترک: "خیر",
                          وضعیت: "فعال",
                        },
                        {
                          "کد رشته": "102",
                          "عنوان رشته": "دندانپزشکی",
                          توضیحات: "رشته دندانپزشکی",
                          مشترک: "بله",
                          وضعیت: "فعال",
                        },
                      ];
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "نمونه");
                      XLSX.writeFile(wb, "employment-fields-sample.xlsx");
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <FaDownload className="h-4 w-4" />
                    نمونه فایل
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ستون‌های مورد نیاز: کد رشته، عنوان رشته، توضیحات (اختیاری),
                  مشترک (بله/خیر - اختیاری), وضعیت (فعال/غیرفعال)
                </p>
              </div>

              {/* پیش‌نمایش داده‌ها */}
              {excelData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    پیش‌نمایش داده‌ها ({excelData.length} مورد)
                  </h4>
                  <div className="max-h-60 overflow-auto border border-gray-300 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            ردیف
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            کد رشته
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            عنوان رشته
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            توضیحات
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            وضعیت
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            وضعیت اعتبارسنجی
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {excelData.map((item, index) => (
                          <tr
                            key={index}
                            className={item.valid ? "" : "bg-red-50"}
                          >
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.row}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono">
                              {item.fieldCode}
                            </td>
                            <td className="px-4 py-2 text-sm">{item.title}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.description}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  item.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.isActive ? "فعال" : "غیرفعال"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.valid ? (
                                <span className="text-green-600">✓ معتبر</span>
                              ) : (
                                <span
                                  className="text-red-600"
                                  title={item.error}
                                >
                                  ✗ نامعتبر
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    معتبر: {excelData.filter((item) => item.valid).length} مورد
                    | نامعتبر: {excelData.filter((item) => !item.valid).length}{" "}
                    مورد
                  </div>
                </div>
              )}

              {/* دکمه‌های عملیات */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExcelModal(false);
                    setExcelData([]);
                    setExcelFile(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                {excelData.length > 0 && (
                  <button
                    onClick={handleImportExcel}
                    disabled={
                      importLoading ||
                      excelData.filter((item) => item.valid).length === 0
                    }
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {importLoading && (
                      <FaSpinner className="animate-spin h-4 w-4" />
                    )}
                    Import ({excelData.filter((item) => item.valid).length} مورد
                    معتبر)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
