"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheck,
  FaTimes,
  FaThumbsUp,
  FaThumbsDown,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCalendarAlt,
  FaUser,
  FaList,
  FaFileExport,
  FaFileImport,
  FaSpinner,
} from "react-icons/fa";

export default function ClauseConditionsPage() {
  // State ها
  const [conditions, setConditions] = useState([]);
  const [helpers, setHelpers] = useState({
    transferReasons: [],
    conditionTypes: [],
    importanceLevels: [],
    statistics: {},
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add, edit, view
  const [selectedCondition, setSelectedCondition] = useState(null);

  // State برای فیلترها و جستجو
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // State برای فرم
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    conditionType: "",
    relatedClauses: [],
    importanceLevel: "medium",
    isActive: true,
    validFrom: "",
    validUntil: "",
  });

  // دریافت داده‌های کمکی
  const fetchHelpers = async () => {
    try {
      const response = await fetch("/api/clause-conditions/helpers");
      const data = await response.json();

      if (data.success) {
        setHelpers(data.data);
      } else {
        toast.error("خطا در دریافت اطلاعات پایه");
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
      toast.error("خطا در ارتباط با سرور");
    }
  };

  // دریافت لیست شرایط
  const fetchConditions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        conditionType: filterType,
        isActive: filterActive,
        includeInactive: "true",
      });

      console.log(
        "🚀 Fetching conditions with URL:",
        `/api/clause-conditions?${params}`
      );
      const response = await fetch(`/api/clause-conditions?${params}`);
      console.log("📡 Response status:", response.status);
      console.log(
        "📡 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error:", response.status, errorText);
        toast.error(`خطا در درخواست: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log("📄 Response data:", data);

      if (data.success) {
        console.log(
          "✅ Successfully received conditions:",
          data.data.conditions.length
        );
        if (data.debug) {
          console.log("🔍 Debug info:", data.debug);
        }
        setConditions(data.data.conditions);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        console.error("❌ API error:", data.error);
        toast.error("خطا در دریافت شرایط: " + data.error);
      }
    } catch (error) {
      console.error("💥 Network error:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  // useEffect ها
  useEffect(() => {
    fetchHelpers();
  }, []);

  useEffect(() => {
    fetchConditions();
  }, [currentPage, searchTerm, filterType, filterActive]);

  // مدیریت تغییرات فرم
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // مدیریت انتخاب بندها
  const handleClauseSelection = (clauseId, isSelected) => {
    setFormData((prev) => {
      if (isSelected) {
        // اضافه کردن بند جدید
        if (
          !prev.relatedClauses.find((clause) => clause.clauseId === clauseId)
        ) {
          return {
            ...prev,
            relatedClauses: [...prev.relatedClauses, { clauseId, priority: 5 }],
          };
        }
      } else {
        // حذف بند
        return {
          ...prev,
          relatedClauses: prev.relatedClauses.filter(
            (clause) => clause.clauseId !== clauseId
          ),
        };
      }
      return prev;
    });
  };

  // تنظیم اولویت بند
  const handlePriorityChange = (clauseId, priority) => {
    setFormData((prev) => ({
      ...prev,
      relatedClauses: prev.relatedClauses.map((clause) =>
        clause.clauseId === clauseId
          ? { ...clause, priority: parseInt(priority) }
          : clause
      ),
    }));
  };

  // باز کردن مدال
  const openModal = (mode, condition = null) => {
    setModalMode(mode);
    setSelectedCondition(condition);

    if (mode === "add") {
      setFormData({
        title: "",
        description: "",
        conditionType: "",
        relatedClauses: [],
        importanceLevel: "medium",
        isActive: true,
        validFrom: "",
        validUntil: "",
      });
    } else if (mode === "edit" && condition) {
      setFormData({
        title: condition.title || "",
        description: condition.description || "",
        conditionType: condition.conditionType || "",
        relatedClauses: condition.relatedClauses || [],
        importanceLevel: condition.importanceLevel || "medium",
        isActive: condition.isActive !== undefined ? condition.isActive : true,
        validFrom: condition.validFrom
          ? new Date(condition.validFrom).toISOString().split("T")[0]
          : "",
        validUntil: condition.validUntil
          ? new Date(condition.validUntil).toISOString().split("T")[0]
          : "",
      });
    }

    setShowModal(true);
  };

  // بستن مدال
  const closeModal = () => {
    setShowModal(false);
    setSelectedCondition(null);
    setModalMode("add");
  };

  // ارسال فرم
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.conditionType) {
      toast.error("لطفاً عنوان و نوع شرط را وارد کنید");
      return;
    }

    try {
      setSubmitting(true);

      const requestData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
      };

      if (modalMode === "edit" && selectedCondition) {
        requestData.id = selectedCondition._id;
      }

      const response = await fetch("/api/clause-conditions", {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        closeModal();
        fetchConditions();
        fetchHelpers(); // برای بروزرسانی آمار
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("خطا در ارسال اطلاعات");
    } finally {
      setSubmitting(false);
    }
  };

  // حذف شرط
  const handleDelete = async (condition) => {
    if (!confirm(`آیا از حذف شرط "${condition.title}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/clause-conditions?id=${condition._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchConditions();
        fetchHelpers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error deleting condition:", error);
      toast.error("خطا در حذف شرط");
    }
  };

  // تغییر وضعیت فعال/غیرفعال
  const toggleActiveStatus = async (condition) => {
    try {
      const response = await fetch("/api/clause-conditions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: condition._id,
          isActive: !condition.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`شرط ${condition.isActive ? "غیرفعال" : "فعال"} شد`);
        fetchConditions();
        fetchHelpers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("خطا در تغییر وضعیت");
    }
  };

  // دریافت رنگ برای نوع شرط
  const getConditionTypeColor = (type) => {
    return type === "approval"
      ? "text-green-600 bg-green-100"
      : "text-red-600 bg-red-100";
  };

  // دریافت رنگ برای سطح اهمیت
  const getImportanceColor = (level) => {
    const colors = {
      low: "text-gray-600 bg-gray-100",
      medium: "text-blue-600 bg-blue-100",
      high: "text-orange-600 bg-orange-100",
      critical: "text-red-600 bg-red-100",
    };
    return colors[level] || "text-gray-600 bg-gray-100";
  };

  // ایجاد شرط تست
  const createTestCondition = async () => {
    try {
      console.log("🧪 Creating test condition...");
      const response = await fetch("/api/test-clause-condition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Test condition created:", data.data);
        toast.success("شرط تست با موفقیت ایجاد شد!");
        fetchConditions();
        fetchHelpers();
      } else {
        console.error("❌ Failed to create test condition:", data.error);
        toast.error("خطا در ایجاد شرط تست: " + data.error);
      }
    } catch (error) {
      console.error("💥 Error creating test condition:", error);
      toast.error("خطا در ارتباط با سرور");
    }
  };

  // بررسی دیتابیس
  const debugDatabase = async () => {
    try {
      console.log("🔍 Debugging database...");
      const response = await fetch("/api/debug-clause-conditions");
      const data = await response.json();

      if (data.success) {
        console.log("🔍 Debug results:", data.debug);
        const debug = data.debug;

        alert(`🔍 نتایج بررسی دیتابیس:
        
Collections موجود: ${debug.availableCollections.join(", ")}

مستقیم از MongoDB: ${debug.directQueryCount} شرط
از طریق Model: ${debug.modelQueryCount} شرط
نام Collection در Model: ${debug.modelCollectionName}

آیا collection "clauseconditions" وجود دارد؟ ${
          debug.hasClauseConditionsCollection ? "بله" : "خیر"
        }

جزئیات در Console مشاهده کنید.`);
      } else {
        console.error("❌ Debug failed:", data.error);
        toast.error("خطا در بررسی دیتابیس: " + data.error);
      }
    } catch (error) {
      console.error("💥 Error debugging:", error);
      toast.error("خطا در ارتباط با سرور");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          مدیریت شرایط بندها
        </h1>
        <p className="text-gray-600">
          مدیریت شرایط موافقت و مخالفت برای بندهای انتقال
        </p>
      </div>

      {/* آمار کلی */}
      {helpers.statistics && Object.keys(helpers.statistics).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <FaList className="h-8 w-8 text-blue-500" />
              <div className="mr-4">
                <p className="text-blue-600 text-sm font-medium">کل شرایط</p>
                <p className="text-2xl font-bold text-gray-900">
                  {helpers.statistics.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <FaCheck className="h-8 w-8 text-green-500" />
              <div className="mr-4">
                <p className="text-green-600 text-sm font-medium">فعال</p>
                <p className="text-2xl font-bold text-gray-900">
                  {helpers.statistics.active}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
            <div className="flex items-center">
              <FaTimes className="h-8 w-8 text-gray-500" />
              <div className="mr-4">
                <p className="text-gray-600 text-sm font-medium">غیرفعال</p>
                <p className="text-2xl font-bold text-gray-900">
                  {helpers.statistics.inactive}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-emerald-500">
            <div className="flex items-center">
              <FaThumbsUp className="h-8 w-8 text-emerald-500" />
              <div className="mr-4">
                <p className="text-emerald-600 text-sm font-medium">موافقت</p>
                <p className="text-2xl font-bold text-gray-900">
                  {helpers.statistics.approval}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-rose-500">
            <div className="flex items-center">
              <FaThumbsDown className="h-8 w-8 text-rose-500" />
              <div className="mr-4">
                <p className="text-rose-600 text-sm font-medium">مخالفت</p>
                <p className="text-2xl font-bold text-gray-900">
                  {helpers.statistics.rejection}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* فیلترها و دکمه افزودن */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* جستجو */}
          <div className="flex-1 relative">
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در عنوان، شرح یا شناسه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* فیلترها */}
          <div className="flex gap-3">
            {/* فیلتر نوع */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">همه انواع</option>
              {helpers.conditionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* فیلتر وضعیت */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </select>

            {/* دکمه تست */}
            {conditions.length === 0 && (
              <button
                onClick={createTestCondition}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaUser className="h-4 w-4" />
                ایجاد شرط تست
              </button>
            )}

            {/* دکمه افزودن */}
            <button
              onClick={() => openModal("add")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              افزودن شرط جدید
            </button>
          </div>
        </div>
      </div>

      {/* جدول شرایط */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
            <span className="mr-3 text-gray-600">در حال بارگیری...</span>
          </div>
        ) : conditions.length === 0 ? (
          <div className="text-center py-12">
            <FaInfoCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">هیچ شرطی یافت نشد</p>
            <p className="text-gray-500 text-sm mb-6">
              برای شروع، می‌توانید یک شرط تست ایجاد کنید یا شرط جدید اضافه
              نمایید
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={createTestCondition}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaUser className="h-4 w-4" />
                ایجاد شرط تست
              </button>
              <button
                onClick={debugDatabase}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaExclamationTriangle className="h-4 w-4" />
                بررسی دیتابیس
              </button>
              <button
                onClick={() => openModal("add")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FaPlus className="h-4 w-4" />
                افزودن شرط جدید
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عنوان شرط
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      سطح اهمیت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تعداد بندها
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ ایجاد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-right">
                  {conditions.map((condition) => (
                    <tr key={condition._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {condition.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {condition.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionTypeColor(
                            condition.conditionType
                          )}`}
                        >
                          {condition.conditionType === "approval" ? (
                            <>
                              <FaThumbsUp className="h-3 w-3 ml-1" /> موافقت
                            </>
                          ) : (
                            <>
                              <FaThumbsDown className="h-3 w-3 ml-1" /> مخالفت
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImportanceColor(
                            condition.importanceLevel
                          )}`}
                        >
                          {helpers.importanceLevels.find(
                            (level) => level.value === condition.importanceLevel
                          )?.label || condition.importanceLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {condition.relatedClauses
                            ? condition.relatedClauses.length
                            : 0}{" "}
                          بند
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            condition.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {condition.isActive ? (
                            <>
                              <FaCheck className="h-3 w-3 ml-1" /> فعال
                            </>
                          ) : (
                            <>
                              <FaTimes className="h-3 w-3 ml-1" /> غیرفعال
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaCalendarAlt className="h-3 w-3 ml-1" />
                          {new Date(condition.createdAt).toLocaleDateString(
                            "fa-IR"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal("view", condition)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="مشاهده جزئیات"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal("edit", condition)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActiveStatus(condition)}
                            className={`${
                              condition.isActive
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            } transition-colors`}
                            title={
                              condition.isActive ? "غیرفعال کردن" : "فعال کردن"
                            }
                          >
                            {condition.isActive ? (
                              <FaTimes className="h-4 w-4" />
                            ) : (
                              <FaCheck className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(condition)}
                            className="text-red-600 hover:text-red-900 transition-colors"
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
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    قبلی
                  </button>
                  <span className="text-sm text-gray-700">
                    صفحه {currentPage} از {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* مدال افزودن/ویرایش/مشاهده */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    {modalMode === "add" ? (
                      <FaPlus className="h-6 w-6 text-white" />
                    ) : modalMode === "edit" ? (
                      <FaEdit className="h-6 w-6 text-white" />
                    ) : (
                      <FaEye className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="mr-4">
                    <h3 className="text-lg font-bold text-white">
                      {modalMode === "add"
                        ? "افزودن شرط جدید"
                        : modalMode === "edit"
                        ? "ویرایش شرط"
                        : "جزئیات شرط"}
                    </h3>
                    <p className="text-sm text-blue-100">
                      {modalMode === "view"
                        ? "مشاهده اطلاعات شرط"
                        : "اطلاعات شرط را وارد کنید"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* عنوان شرط */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان شرط <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      placeholder="عنوان شرط را وارد کنید"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {/* نوع شرط */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع شرط <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="conditionType"
                      value={formData.conditionType}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      {helpers.conditionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* سطح اهمیت */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سطح اهمیت
                    </label>
                    <select
                      name="importanceLevel"
                      value={formData.importanceLevel}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      {helpers.importanceLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* تاریخ شروع اعتبار */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاریخ شروع اعتبار
                    </label>
                    <input
                      type="date"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  {/* تاریخ انقضا */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاریخ انقضا (اختیاری)
                    </label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  {/* شرح شرط */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      شرح و توضیحات{" "}
                      <span className="text-gray-400">(اختیاری)</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      disabled={modalMode === "view"}
                      rows={4}
                      placeholder="شرح کامل شرط را وارد کنید (اختیاری)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
                    />
                  </div>

                  {/* وضعیت فعال/غیرفعال */}
                  {modalMode !== "add" && (
                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          disabled={modalMode === "view"}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50"
                        />
                        <span className="mr-2 text-sm font-medium text-gray-700">
                          شرط فعال است
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* انتخاب بندهای مرتبط */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    بندهای مرتبط
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {helpers.transferReasons.length === 0 ? (
                      <p className="text-gray-500 text-center">
                        هیچ بندی یافت نشد
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {helpers.transferReasons.map((reason) => {
                          const isSelected = formData.relatedClauses.some(
                            (clause) => clause.clauseId === reason._id
                          );
                          const selectedClause = formData.relatedClauses.find(
                            (clause) => clause.clauseId === reason._id
                          );

                          return (
                            <div
                              key={reason._id}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                isSelected
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleClauseSelection(
                                      reason._id,
                                      e.target.checked
                                    )
                                  }
                                  disabled={modalMode === "view"}
                                  className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                />
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {reason.title}
                                  </h4>
                                  {reason.description && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {reason.description.length > 100
                                        ? reason.description.substring(0, 100) +
                                          "..."
                                        : reason.description}
                                    </p>
                                  )}
                                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                    {reason.clauseType}
                                  </span>
                                </div>
                                {isSelected && modalMode !== "view" && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-600">
                                      اولویت:
                                    </label>
                                    <select
                                      value={selectedClause?.priority || 5}
                                      onChange={(e) =>
                                        handlePriorityChange(
                                          reason._id,
                                          e.target.value
                                        )
                                      }
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                        (num) => (
                                          <option key={num} value={num}>
                                            {num}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {modalMode === "view" ? "بستن" : "انصراف"}
                  </button>
                  {modalMode !== "view" && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <FaSpinner className="animate-spin h-4 w-4" />
                          در حال ذخیره...
                        </>
                      ) : (
                        <>
                          <FaCheck className="h-4 w-4" />
                          {modalMode === "add" ? "ایجاد شرط" : "بروزرسانی"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
