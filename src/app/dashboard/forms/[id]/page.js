"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  FaEdit,
  FaArrowRight,
  FaUsers,
  FaCalendar,
  FaCog,
  FaPaperPlane,
  FaCheckCircle,
} from "react-icons/fa";
import FileUpload from "@/components/forms/FileUpload";

export default function FormViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUserContext();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);

  // Check if user can manage forms
  const canManageForms =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

  // Check if user can edit this specific form
  const canEditForm = (form) => {
    if (!canManageForms || !form) return false;
    // General Manager can edit all forms from province roles
    if (user.role === "generalManager") {
      return [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(form.createdByRole);
    }
    // Other users can only edit forms created by their own role
    return form.createdByRole === user.role;
  };

  // Check if user can submit this form
  const canSubmitForm = (form) => {
    if (!form || !user) return false;
    return form.targetRoles.includes(user.role) && form.status === "active";
  };

  const checkExistingSubmission = async (formId) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${formId}/submissions?limit=1`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.submissions.length > 0) {
          setExistingSubmission(data.submissions[0]);
        }
      }
    } catch (error) {
      console.error("Error checking existing submission:", error);
    }
  };

  useEffect(() => {
    if (id && user) {
      fetchForm();
    }
  }, [id, user]);

  const fetchForm = async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت فرم: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setForm(data.form);

        // Check if user has already submitted this form
        if (canSubmitForm(data.form)) {
          await checkExistingSubmission(data.form._id);
        }

        // Initialize form data
        const initialData = {};
        data.form.fields.forEach((field) => {
          if (field.type === "checkbox") {
            initialData[field.id] = [];
          } else if (field.type === "file") {
            initialData[field.id] = [];
          } else {
            initialData[field.id] = "";
          }
        });
        setFormData(initialData);
      } else {
        throw new Error(data.message || "خطا در دریافت فرم");
      }
    } catch (error) {
      console.error("Error fetching form:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCheckboxChange = (fieldId, optionValue, checked) => {
    setFormData((prev) => {
      const currentValues = prev[fieldId] || [];
      if (checked) {
        return {
          ...prev,
          [fieldId]: [...currentValues, optionValue],
        };
      } else {
        return {
          ...prev,
          [fieldId]: currentValues.filter((v) => v !== optionValue),
        };
      }
    });
  };

  const validateCurrentStep = () => {
    if (!form.settings.showProgressBar) return true;

    const fieldsPerStep = Math.ceil(form.fields.length / 3);
    const startIndex = currentStep * fieldsPerStep;
    const endIndex = Math.min(startIndex + fieldsPerStep, form.fields.length);
    const currentFields = form.fields.slice(startIndex, endIndex);

    for (const field of currentFields) {
      if (field.required) {
        const value = formData[field.id];
        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          value === ""
        ) {
          toast.error(`فیلد "${field.label}" الزامی است`);
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateCurrentStep()) return;

    // Validate all required fields
    for (const field of form.fields) {
      if (field.required) {
        const value = formData[field.id];
        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          value === ""
        ) {
          toast.error(`فیلد "${field.label}" الزامی است`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const responses = form.fields.map((field) => ({
        fieldId: field.id,
        value: formData[field.id],
      }));

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/forms/${id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ responses }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        toast.success(data.message);
      } else {
        toast.error(data.message || "خطا در ارسال فرم");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("خطا در ارسال فرم");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fa-IR");
    } catch (e) {
      return dateString;
    }
  };

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

  const getGenderText = (gender) => {
    switch (gender) {
      case "male":
        return "مردانه";
      case "female":
        return "زنانه";
      default:
        return "همه";
    }
  };

  const getPeriodText = (period) => {
    switch (period) {
      case "morning":
        return "صبح";
      case "evening":
        return "عصر";
      default:
        return "همه";
    }
  };

  const getOrganizationTypeText = (type) => {
    switch (type) {
      case "school":
        return "مدرسه";
      case "university":
        return "دانشگاه";
      case "institute":
        return "موسسه";
      default:
        return "همه";
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            فرم یافت نشد
          </h3>
          <p className="text-gray-500 mb-4">
            فرم مورد نظر وجود ندارد یا حذف شده است.
          </p>
          <Link
            href="/dashboard/forms"
            className="text-blue-600 hover:text-blue-800"
          >
            بازگشت به لیست فرم‌ها
          </Link>
        </div>
      </div>
    );
  }

  // Show success message if form is submitted
  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            فرم با موفقیت ارسال شد
          </h3>
          <p className="text-gray-600 mb-6">{form.settings.successMessage}</p>
          <div className="space-x-4">
            <Link
              href="/dashboard/forms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              بازگشت به فرم‌ها
            </Link>
            {form.settings.allowMultipleSubmissions && (
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentStep(0);
                  // Reset form data
                  const initialData = {};
                  form.fields.forEach((field) => {
                    if (field.type === "checkbox") {
                      initialData[field.id] = [];
                    } else {
                      initialData[field.id] = "";
                    }
                  });
                  setFormData(initialData);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ارسال مجدد
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show form submission interface for target users
  if (canSubmitForm(form)) {
    // If user has already submitted and multiple submissions not allowed
    if (existingSubmission && !form.settings.allowMultipleSubmissions) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              شما قبلاً این فرم را تکمیل کرده‌اید
            </h3>
            <p className="text-gray-600 mb-6">
              وضعیت فرم شما:{" "}
              <span
                className={`font-medium ${
                  existingSubmission.status === "approved"
                    ? "text-green-600"
                    : existingSubmission.status === "rejected"
                    ? "text-red-600"
                    : existingSubmission.status === "reviewed"
                    ? "text-yellow-600"
                    : "text-blue-600"
                }`}
              >
                {existingSubmission.status === "approved"
                  ? "تایید شده"
                  : existingSubmission.status === "rejected"
                  ? "رد شده"
                  : existingSubmission.status === "reviewed"
                  ? "بررسی شده"
                  : "ارسال شده"}
              </span>
            </p>
            <div className="space-x-4">
              <Link
                href="/dashboard/forms"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                بازگشت به فرم‌ها
              </Link>
              <Link
                href={`/dashboard/submissions/${existingSubmission._id}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                مشاهده جزئیات ارسال
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const totalSteps = form.settings.showProgressBar
      ? Math.ceil(form.fields.length / 10)
      : 1;
    const fieldsPerStep = Math.ceil(form.fields.length / totalSteps);
    const startIndex = currentStep * fieldsPerStep;
    const endIndex = Math.min(startIndex + fieldsPerStep, form.fields.length);
    const currentFields = form.settings.showProgressBar
      ? form.fields.slice(startIndex, endIndex)
      : form.fields;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/dashboard/forms"
              className="text-gray-600 hover:text-gray-800 ml-4"
            >
              <FaArrowRight />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">تکمیل فرم</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {form.title}
            </h2>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
          </div>

          {/* Progress Bar */}
          {form.settings.showProgressBar && totalSteps > 1 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  مرحله {currentStep + 1} از {totalSteps}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(progress)}% تکمیل شده
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentFields.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={formData[field.id]}
                onChange={handleInputChange}
                onCheckboxChange={handleCheckboxChange}
              />
            ))}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <div>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    مرحله قبل
                  </button>
                )}
              </div>
              <div>
                {currentStep < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    مرحله بعد
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        در حال ارسال...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="ml-2" />
                        {form.settings.submitButtonText}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show management interface for form managers
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/forms"
            className="text-gray-600 hover:text-gray-800 ml-4"
          >
            <FaArrowRight />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">جزئیات فرم</h1>
        </div>
        {canEditForm(form) && (
          <Link
            href={`/dashboard/forms/${form._id}/edit`}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FaEdit className="ml-2" />
            ویرایش فرم
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Info Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaCog className="ml-2" />
              اطلاعات فرم
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  وضعیت
                </label>
                <span
                  className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                    form.status === "active"
                      ? "bg-green-100 text-green-800"
                      : form.status === "inactive"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {getStatusText(form.status)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  سازنده
                </label>
                <span className="bg-gray-50 text-gray-700 text-sm px-2 py-1 rounded-full">
                  {getRoleText(form.createdByRole)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاریخ ایجاد
                </label>
                <p className="text-sm text-gray-600 flex items-center">
                  <FaCalendar className="ml-2" />
                  {formatDate(form.createdAt)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تعداد فیلدها
                </label>
                <span className="bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-full">
                  {form.fields.length} فیلد
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaUsers className="ml-2" />
                  گروه‌های هدف
                </label>
                <div className="space-y-1">
                  {form.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="block bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {getRoleText(role)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Exam Center Filters */}
              {form.targetRoles.includes("examCenterManager") &&
                (form.targetGender ||
                  form.targetPeriod ||
                  form.targetOrganizationType) && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-800 mb-3">
                      فیلترهای واحد سازمانی
                    </h4>
                    <div className="space-y-2">
                      {form.targetGender && (
                        <div>
                          <span className="text-xs text-gray-600">جنسیت: </span>
                          <span className="text-xs font-medium">
                            {getGenderText(form.targetGender)}
                          </span>
                        </div>
                      )}
                      {form.targetPeriod && (
                        <div>
                          <span className="text-xs text-gray-600">دوره: </span>
                          <span className="text-xs font-medium">
                            {getPeriodText(form.targetPeriod)}
                          </span>
                        </div>
                      )}
                      {form.targetOrganizationType && (
                        <div>
                          <span className="text-xs text-gray-600">
                            نوع سازمان:{" "}
                          </span>
                          <span className="text-xs font-medium">
                            {getOrganizationTypeText(
                              form.targetOrganizationType
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Form Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تنظیمات فرم
                </label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full ml-2 ${
                        form.settings.allowMultipleSubmissions
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    ></span>
                    <span className="text-gray-600">ارسال چندباره</span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full ml-2 ${
                        form.settings.showProgressBar
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    ></span>
                    <span className="text-gray-600">نوار پیشرفت</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">پیش‌نمایش فرم</h3>

            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {form.title}
                </h2>
                {form.description && (
                  <p className="text-gray-600">{form.description}</p>
                )}
              </div>

              {form.settings.showProgressBar && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-0"></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    0 از {form.fields.length} فیلد
                  </p>
                </div>
              )}

              <form className="space-y-6">
                {form.fields.map((field, index) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 mr-1">*</span>
                      )}
                    </label>
                    {field.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {field.description}
                      </p>
                    )}
                    <FieldPreview field={field} />
                  </div>
                ))}

                <div className="pt-6">
                  <button
                    type="button"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
                    disabled
                  >
                    {form.settings.submitButtonText}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FormField Component for interactive form filling
function FormField({ field, value, onChange, onCheckboxChange }) {
  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "tel":
        return (
          <input
            type={field.type}
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "select":
        return (
          <select
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">انتخاب کنید...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  required={field.required}
                  className="ml-2"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={(value || []).includes(option.value)}
                  onChange={(e) =>
                    onCheckboxChange(field.id, option.value, e.target.checked)
                  }
                  className="ml-2"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <FileUpload
            maxFiles={field.validation?.maxFiles || 3}
            existingFiles={value || []}
            onFileUploaded={(file) => {
              const currentFiles = value || [];
              onChange(field.id, [...currentFiles, file]);
            }}
            onFileRemoved={(file, index) => {
              const currentFiles = value || [];
              const newFiles = currentFiles.filter((_, i) => i !== index);
              onChange(field.id, newFiles);
            }}
          />
        );

      default:
        return <div className="text-gray-400">نوع فیلد نامشخص</div>;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-600 mb-2">{field.description}</p>
      )}
      {renderField()}
    </div>
  );
}

// Field Preview Component
function FieldPreview({ field }) {
  const renderField = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "tel":
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            disabled
          />
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            disabled
          />
        );

      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            disabled
          />
        );

      case "date":
        return (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            disabled
          />
        );

      case "select":
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            disabled
          >
            <option>انتخاب کنید...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  className="ml-2"
                  disabled
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  className="ml-2"
                  disabled
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center bg-gray-50">
            <div className="text-gray-400 mb-2">📎</div>
            <p className="text-sm text-gray-500">فایل خود را انتخاب کنید</p>
            {field.validation?.maxSize && (
              <p className="text-xs text-gray-400 mt-1">
                حداکثر حجم: {field.validation.maxSize} مگابایت
              </p>
            )}
          </div>
        );

      default:
        return <div className="text-gray-400">نوع فیلد نامشخص</div>;
    }
  };

  return <div>{renderField()}</div>;
}
