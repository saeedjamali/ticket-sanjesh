"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { ROLES } from "@/lib/permissions";
import { toast } from "react-hot-toast";

export default function FormsPage() {
  const { user, loading: userLoading } = useUserContext();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("active");
  const [selectedItems, setSelectedItems] = useState([]);
  const [submissionFilter, setSubmissionFilter] = useState("all"); // all, submitted, pending

  // Determine if user can create/manage forms
  const canManageForms =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

  // Determine if user can view forms (either as manager or target user)
  const canViewForms =
    user &&
    (canManageForms ||
      [
        "districtEducationExpert",
        "districtTechExpert",
        "districtEvalExpert",
        "examCenterManager",
      ].includes(user.role));

  // Check if user can edit/delete a specific form
  const canEditForm = (form) => {
    if (!canManageForms) return false;
    // General Manager can edit all forms from province roles, others can only edit their own
    if (user.role === "generalManager") {
      return [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(form.createdByRole);
    }
    return form.createdByRole === user.role;
  };

  useEffect(() => {
    if (user && canViewForms) {
      fetchForms(currentPage, filter);
    }
  }, [currentPage, filter, user]);

  // Filter forms based on submission status for target users
  const filteredForms = canManageForms
    ? forms
    : forms.filter((form) => {
        if (submissionFilter === "submitted") {
          return form.hasSubmitted;
        } else if (submissionFilter === "pending") {
          return !form.hasSubmitted;
        }
        return true; // "all"
      });

  const fetchForms = async (page = 1, status = "active") => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      // For target users, don't send status filter (they only see active forms)
      const url = canManageForms
        ? `/api/forms?page=${page}&status=${status}`
        : `/api/forms?page=${page}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت فرم‌ها: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setForms(data.forms);
        setTotalPages(data.pagination.pages || 1);
      } else {
        throw new Error(data.message || "خطا در دریافت فرم‌ها");
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
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
    // Check if user can edit this form
    const form = forms.find((f) => f._id === id);
    if (!form || !canEditForm(form)) {
      toast.error("شما اجازه حذف این فرم را ندارید");
      return;
    }

    if (!window.confirm("آیا از حذف این فرم اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("فرم با موفقیت حذف شد");
        fetchForms(currentPage, filter); // Refresh the list
      } else {
        toast.error(data.message || "خطا در حذف فرم");
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("خطا در حذف فرم");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const form = forms.find((f) => f._id === id);

      if (!form) return;

      // Check if user can edit this form
      if (!canEditForm(form)) {
        toast.error("شما اجازه ویرایش این فرم را ندارید");
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `وضعیت فرم با موفقیت به ${getStatusText(newStatus)} تغییر کرد`
        );
        fetchForms(currentPage, filter); // Refresh the list
      } else {
        toast.error(data.message || "خطا در بروزرسانی وضعیت فرم");
      }
    } catch (error) {
      console.error("Error updating form status:", error);
      toast.error("خطا در بروزرسانی وضعیت فرم");
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

  // Helper function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "فعال";
      case "inactive":
        return "غیرفعال";
      case "draft":
        return "پیش‌نویس";
      default:
        return status;
    }
  };

  // Helper function to get role text in Persian
  const getRoleText = (role) => {
    switch (role) {
      case "generalManager":
        return "مدیر کل";
      case "provinceEducationExpert":
        return "کارشناس سنجش استان";
      case "provinceTechExpert":
        return "کارشناس فناوری استان";
      case "provinceEvalExpert":
        return "کارشناس ارزیابی استان";
      case "districtEducationExpert":
        return "کارشناس سنجش منطقه";
      case "districtTechExpert":
        return "کارشناس فناوری منطقه";
      case "districtEvalExpert":
        return "کارشناس ارزیابی منطقه";
      case "examCenterManager":
        return "مدیر واحد سازمانی";
      default:
        return role;
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!canViewForms) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">دسترسی محدود</h3>
        <p className="text-gray-500">شما اجازه دسترسی به این بخش را ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {canManageForms ? "مدیریت فرم‌ها" : "فرم‌های قابل تکمیل"}
        </h1>
        {canManageForms && (
          <Link
            href="/dashboard/forms/create"
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
            <span>ایجاد فرم جدید</span>
          </Link>
        )}
      </div>

      {/* Statistics for target users */}
      {!canManageForms && forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-r-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">📋</span>
                </div>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-500">کل فرم‌ها</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {forms.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-r-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-500">تکمیل شده</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {forms.filter((f) => f.hasSubmitted).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-r-4 border-orange-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-sm font-medium">
                    ⏳
                  </span>
                </div>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-500">در انتظار</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {forms.filter((f) => !f.hasSubmitted).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            {canManageForms && (
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
                  <option value="draft">پیش‌نویس</option>
                </select>
              </div>
            )}

            {!canManageForms && (
              <div className="flex items-center">
                <label
                  htmlFor="submissionFilter"
                  className="ml-2 text-sm font-medium"
                >
                  وضعیت تکمیل:
                </label>
                <select
                  id="submissionFilter"
                  value={submissionFilter}
                  onChange={(e) => setSubmissionFilter(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1"
                >
                  <option value="all">همه فرم‌ها</option>
                  <option value="pending">در انتظار تکمیل</option>
                  <option value="submitted">تکمیل شده</option>
                </select>
              </div>
            )}
          </div>

          {selectedItems.length > 0 && (
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
                  selectedItems.forEach((id) => updateStatus(id, "draft"));
                  setSelectedItems([]);
                }}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm hover:bg-purple-200"
              >
                پیش‌نویس کردن ({selectedItems.length})
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `آیا از حذف ${selectedItems.length} فرم انتخاب شده اطمینان دارید؟`
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
        ) : filteredForms.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              هیچ فرمی یافت نشد!
            </h3>
            <p className="text-gray-500 mb-6">
              {canManageForms
                ? `در این بخش هیچ فرمی با وضعیت ${getStatusText(
                    filter
                  )} وجود ندارد.`
                : submissionFilter === "submitted"
                ? "شما هنوز هیچ فرمی را تکمیل نکرده‌اید."
                : submissionFilter === "pending"
                ? "همه فرم‌های موجود تکمیل شده‌اند."
                : "در حال حاضر هیچ فرم فعالی برای شما وجود ندارد."}
            </p>
            {canManageForms && (
              <Link
                href="/dashboard/forms/create"
                className="btn-primary p-2 rounded-md"
              >
                ایجاد فرم جدید
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {canManageForms && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={
                            filteredForms.filter((f) => canEditForm(f)).length >
                              0 &&
                            selectedItems.length ===
                              filteredForms.filter((f) => canEditForm(f)).length
                          }
                          onChange={(e) => {
                            const editableForms = filteredForms.filter((f) =>
                              canEditForm(f)
                            );
                            if (e.target.checked) {
                              setSelectedItems(editableForms.map((f) => f._id));
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
                      تعداد فیلد
                    </th>
                    {!canManageForms && (
                      <>
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          توضیحات
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          وضعیت تکمیل
                        </th>
                      </>
                    )}
                    {canManageForms && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        گروه هدف
                      </th>
                    )}
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      سازنده
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      تاریخ ایجاد
                    </th>
                    {canManageForms && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        وضعیت
                      </th>
                    )}
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredForms.map((form) => (
                    <tr key={form._id} className="hover:bg-gray-50">
                      {canManageForms && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {canEditForm(form) && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={selectedItems.includes(form._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems([
                                    ...selectedItems,
                                    form._id,
                                  ]);
                                } else {
                                  setSelectedItems(
                                    selectedItems.filter(
                                      (id) => id !== form._id
                                    )
                                  );
                                }
                              }}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {form.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {form.fields?.length || 0} فیلد
                        </span>
                      </td>
                      {!canManageForms && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {form.description || "بدون توضیحات"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {form.hasSubmitted ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    form.submissionStatus === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : form.submissionStatus === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : form.submissionStatus === "reviewed"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {form.submissionStatus === "approved"
                                    ? "تایید شده"
                                    : form.submissionStatus === "rejected"
                                    ? "رد شده"
                                    : form.submissionStatus === "reviewed"
                                    ? "بررسی شده"
                                    : "ارسال شده"}
                                </span>
                                {form.submissionId && (
                                  <Link
                                    href={`/dashboard/submissions/${form.submissionId}`}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                  >
                                    مشاهده جزئیات
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                در انتظار تکمیل
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {canManageForms && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {form.targetRoles?.slice(0, 2).map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {getRoleText(role)}
                              </span>
                            ))}
                            {form.targetRoles?.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{form.targetRoles.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getRoleText(form.createdByRole)}
                          </span>
                          {form.createdBy?.fullName && (
                            <span className="text-xs text-gray-500 mt-1">
                              {form.createdBy.fullName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {formatDate(form.createdAt)}
                      </td>
                      {canManageForms && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              form.status === "active"
                                ? "bg-green-100 text-green-800"
                                : form.status === "inactive"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {getStatusText(form.status)}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            href={`/dashboard/forms/${form._id}`}
                            className="text-blue-600 hover:text-blue-900 ml-2"
                            title={
                              canManageForms
                                ? "مشاهده جزئیات"
                                : form.hasSubmitted
                                ? "مشاهده فرم"
                                : "تکمیل فرم"
                            }
                          >
                            {canManageForms
                              ? "مشاهده"
                              : form.hasSubmitted
                              ? "مشاهده"
                              : "تکمیل"}
                          </Link>
                          {canManageForms && canEditForm(form) && (
                            <>
                              <Link
                                href={`/dashboard/forms/${form._id}/submissions`}
                                className="text-green-600 hover:text-green-900 ml-2"
                                title="مشاهده گزارش‌های ارسالی"
                              >
                                گزارش‌ها
                              </Link>
                              <Link
                                href={`/dashboard/forms/${form._id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900 ml-2"
                                title="ویرایش"
                              >
                                ویرایش
                              </Link>
                              <button
                                onClick={() => handleDelete(form._id)}
                                className="text-red-600 hover:text-red-900"
                                title="حذف"
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
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    قبلی
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    بعدی
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      نمایش صفحه{" "}
                      <span className="font-medium">{currentPage}</span> از{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        قبلی
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        بعدی
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
