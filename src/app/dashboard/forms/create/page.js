"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaGripVertical,
  FaSave,
  FaEye,
  FaTimes,
  FaCopy,
} from "react-icons/fa";

// Field types configuration
const FIELD_TYPES = {
  text: {
    label: "متن کوتاه",
    icon: "📝",
    defaultProps: {
      label: "فیلد متنی",
      placeholder: "متن خود را وارد کنید",
      required: false,
      validation: { minLength: 0, maxLength: 255 },
    },
  },
  textarea: {
    label: "متن بلند",
    icon: "📄",
    defaultProps: {
      label: "فیلد متن بلند",
      placeholder: "توضیحات خود را وارد کنید",
      required: false,
      validation: { minLength: 0, maxLength: 1000 },
    },
  },
  number: {
    label: "عدد",
    icon: "🔢",
    defaultProps: {
      label: "فیلد عددی",
      placeholder: "عدد را وارد کنید",
      required: false,
      validation: { min: 0, max: 999999 },
    },
  },
  email: {
    label: "ایمیل",
    icon: "📧",
    defaultProps: {
      label: "آدرس ایمیل",
      placeholder: "example@domain.com",
      required: false,
    },
  },
  tel: {
    label: "تلفن",
    icon: "📞",
    defaultProps: {
      label: "شماره تلفن",
      placeholder: "09123456789",
      required: false,
    },
  },
  date: {
    label: "تاریخ",
    icon: "📅",
    defaultProps: {
      label: "تاریخ",
      required: false,
    },
  },
  select: {
    label: "انتخاب از لیست",
    icon: "📋",
    defaultProps: {
      label: "انتخاب کنید",
      required: false,
      options: [
        { label: "گزینه ۱", value: "option1" },
        { label: "گزینه ۲", value: "option2" },
      ],
    },
  },
  radio: {
    label: "انتخاب تکی",
    icon: "🔘",
    defaultProps: {
      label: "یکی را انتخاب کنید",
      required: false,
      options: [
        { label: "گزینه ۱", value: "option1" },
        { label: "گزینه ۲", value: "option2" },
      ],
    },
  },
  checkbox: {
    label: "انتخاب چندگانه",
    icon: "☑️",
    defaultProps: {
      label: "گزینه‌های مورد نظر را انتخاب کنید",
      required: false,
      options: [
        { label: "گزینه ۱", value: "option1" },
        { label: "گزینه ۲", value: "option2" },
      ],
    },
  },
  file: {
    label: "آپلود فایل",
    icon: "📎",
    defaultProps: {
      label: "فایل خود را انتخاب کنید",
      required: false,
      validation: { maxSize: 5 }, // MB
    },
  },
};

// Sortable Field Item Component
function SortableFieldItem({
  field,
  editingField,
  setEditingField,
  updateField,
  deleteField,
  duplicateField,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-white ${
        isDragging
          ? "shadow-lg border-blue-300"
          : "border-gray-200 hover:border-gray-300"
      } ${editingField === field.id ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div
            {...attributes}
            {...listeners}
            className="cursor-move text-gray-400 hover:text-gray-600 ml-2"
          >
            <FaGripVertical />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {FIELD_TYPES[field.type]?.icon} {field.label}
          </span>
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingField(field.id)}
            className="text-blue-600 hover:text-blue-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => duplicateField(field.id)}
            className="text-green-600 hover:text-green-800"
          >
            <FaCopy />
          </button>
          <button
            onClick={() => deleteField(field.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {editingField === field.id ? (
        <FieldEditor
          field={field}
          onUpdate={(updates) => updateField(field.id, updates)}
          onClose={() => setEditingField(null)}
        />
      ) : (
        <FieldPreview field={field} />
      )}
    </div>
  );
}

export default function CreateFormPage() {
  const { user, loading: userLoading } = useUserContext();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    targetRoles: [],
    targetDistricts: [],
    targetGender: null,
    targetPeriod: null,
    targetOrganizationType: null,
    fields: [],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      submitButtonText: "ارسال فرم",
      successMessage: "فرم با موفقیت ارسال شد",
      requireLogin: true,
    },
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [examCenterFilters, setExamCenterFilters] = useState({
    genders: [],
    periods: [],
    organizationTypes: [],
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check permissions
  const canCreateForms =
    user &&
    [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

  // Filter target roles based on user role
  const getAvailableTargetRoles = () => {
    const allRoles = [
      {
        value: "districtEducationExpert",
        label: "کارشناس سنجش منطقه",
      },
      {
        value: "districtTechExpert",
        label: "کارشناس فناوری منطقه",
      },
      {
        value: "districtEvalExpert",
        label: "کارشناس ارزیابی منطقه",
      },
      { value: "examCenterManager", label: "مدیر واحد سازمانی" },
    ];

    // General Manager and Province Evaluation Expert can see all roles
    if (
      user?.role === "generalManager" ||
      user?.role === "provinceEvalExpert"
    ) {
      return allRoles;
    }

    // Province Tech Expert can only see tech-related roles
    if (user?.role === "provinceTechExpert") {
      return allRoles.filter(
        (role) =>
          role.value === "districtTechExpert" ||
          role.value === "examCenterManager"
      );
    }

    // Province Education Expert can only see education-related roles
    if (user?.role === "provinceEducationExpert") {
      return allRoles.filter(
        (role) =>
          role.value === "districtEducationExpert" ||
          role.value === "examCenterManager"
      );
    }

    // Default: return all roles (fallback)
    return allRoles;
  };

  useEffect(() => {
    if (!userLoading && !canCreateForms) {
      router.push("/dashboard/forms");
    }
  }, [user, userLoading, canCreateForms, router]);

  useEffect(() => {
    if (user?.province) {
      fetchDistricts();
      fetchExamCenterFilters();
    }
  }, [user]);

  const fetchDistricts = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/districts?province=${user.province._id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDistricts(data.districts || []);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchExamCenterFilters = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/exam-centers/filters", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExamCenterFilters(
          data.filters || {
            genders: [],
            periods: [],
            organizationTypes: [],
          }
        );
      }
    } catch (error) {
      console.error("Error fetching exam center filters:", error);
    }
  };

  // Generate unique field ID
  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add new field
  const addField = (type) => {
    const newField = {
      id: generateFieldId(),
      type,
      ...FIELD_TYPES[type].defaultProps,
      order: formData.fields.length,
    };

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    // Open field editor
    setEditingField(newField.id);
  };

  // Update field
  const updateField = (fieldId, updates) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  };

  // Delete field
  const deleteField = (fieldId) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));
    setEditingField(null);
  };

  // Duplicate field
  const duplicateField = (fieldId) => {
    const fieldToDuplicate = formData.fields.find((f) => f.id === fieldId);
    if (fieldToDuplicate) {
      const newField = {
        ...fieldToDuplicate,
        id: generateFieldId(),
        label: fieldToDuplicate.label + " (کپی)",
        order: formData.fields.length,
      };

      setFormData((prev) => ({
        ...prev,
        fields: [...prev.fields, newField],
      }));
    }
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFormData((prev) => {
        const oldIndex = prev.fields.findIndex(
          (field) => field.id === active.id
        );
        const newIndex = prev.fields.findIndex((field) => field.id === over.id);

        const newFields = arrayMove(prev.fields, oldIndex, newIndex);

        // Update order property
        const updatedFields = newFields.map((field, index) => ({
          ...field,
          order: index,
        }));

        return {
          ...prev,
          fields: updatedFields,
        };
      });
    }
  };

  // Submit form
  const handleSubmit = async (status = "draft") => {
    if (!formData.title.trim()) {
      toast.error("عنوان فرم الزامی است");
      return;
    }

    if (formData.fields.length === 0) {
      toast.error("حداقل یک فیلد برای فرم الزامی است");
      return;
    }

    if (formData.targetRoles.length === 0) {
      toast.error("انتخاب گروه هدف الزامی است");
      return;
    }

    setLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...formData,
          status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("فرم با موفقیت ایجاد شد");
        router.push("/dashboard/forms");
      } else {
        toast.error(data.message || "خطا در ایجاد فرم");
      }
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("خطا در ایجاد فرم");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!canCreateForms) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ایجاد فرم جدید</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FaEye className="ml-2" />
            {showPreview ? "ویرایش" : "پیش‌نمایش"}
          </button>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            <FaSave className="ml-2" />
            ذخیره پیش‌نویس
          </button>
          <button
            onClick={() => handleSubmit("active")}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FaSave className="ml-2" />
            انتشار فرم
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">تنظیمات فرم</h3>

            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان فرم *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="عنوان فرم را وارد کنید"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  توضیحات
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="توضیحات فرم"
                />
              </div>
            </div>

            {/* Target Roles */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                گروه هدف *
              </label>
              <div className="space-y-2">
                {getAvailableTargetRoles().map((role) => (
                  <label key={role.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.targetRoles.includes(role.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            targetRoles: [...prev.targetRoles, role.value],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            targetRoles: prev.targetRoles.filter(
                              (r) => r !== role.value
                            ),
                          }));
                        }
                      }}
                      className="ml-2"
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Districts */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مناطق هدف (اختیاری)
              </label>
              <select
                multiple
                value={formData.targetDistricts}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFormData((prev) => ({ ...prev, targetDistricts: values }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={4}
              >
                {districts.map((district) => (
                  <option key={district._id} value={district._id}>
                    {district.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Ctrl+Click برای انتخاب چندگانه
              </p>
            </div>

            {/* Exam Center Filters */}
            {formData.targetRoles.includes("examCenterManager") && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-3">
                  فیلترهای واحد سازمانی
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      جنسیت
                    </label>
                    <select
                      value={formData.targetGender || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetGender: e.target.value || null,
                        }))
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="">همه</option>
                      {examCenterFilters.genders.map((gender) => (
                        <option key={gender.value} value={gender.value}>
                          {gender.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      دوره
                    </label>
                    <select
                      value={formData.targetPeriod || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetPeriod: e.target.value || null,
                        }))
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="">همه</option>
                      {examCenterFilters.periods.map((period) => (
                        <option key={period.value} value={period.value}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      نوع سازمان
                    </label>
                    <select
                      value={formData.targetOrganizationType || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetOrganizationType: e.target.value || null,
                        }))
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="">همه</option>
                      {examCenterFilters.organizationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Form Settings */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                تنظیمات فرم
              </h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.allowMultipleSubmissions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          allowMultipleSubmissions: e.target.checked,
                        },
                      }))
                    }
                    className="ml-2"
                  />
                  <span className="text-sm">امکان ارسال چندباره</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.settings.showProgressBar}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          showProgressBar: e.target.checked,
                        },
                      }))
                    }
                    className="ml-2"
                  />
                  <span className="text-sm">نمایش نوار پیشرفت</span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    متن دکمه ارسال
                  </label>
                  <input
                    type="text"
                    value={formData.settings.submitButtonText}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          submitButtonText: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    پیام موفقیت
                  </label>
                  <textarea
                    value={formData.settings.successMessage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          successMessage: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Field Types */}
            {!showPreview && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  افزودن فیلد
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(FIELD_TYPES).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => addField(type)}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                      <span className="text-lg mb-1">{config.icon}</span>
                      <span className="text-xs text-center">
                        {config.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Builder Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {showPreview ? "پیش‌نمایش فرم" : "طراحی فرم"}
              </h3>
              <span className="text-sm text-gray-500">
                {formData.fields.length} فیلد
              </span>
            </div>

            {showPreview ? (
              /* Form Preview */
              <FormPreview formData={formData} />
            ) : (
              /* Form Builder */
              <div>
                {formData.fields.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      فرم خالی است
                    </h3>
                    <p className="text-gray-500 mb-4">
                      برای شروع، از پنل سمت راست یک فیلد اضافه کنید
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.fields.map((field) => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {formData.fields.map((field) => (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            updateField={updateField}
                            deleteField={deleteField}
                            duplicateField={duplicateField}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Field Editor Component
function FieldEditor({ field, onUpdate, onClose }) {
  const [localField, setLocalField] = useState({ ...field });

  const handleSave = () => {
    onUpdate(localField);
    onClose();
  };

  const addOption = () => {
    const newOptions = [
      ...(localField.options || []),
      {
        label: `گزینه ${(localField.options?.length || 0) + 1}`,
        value: `option${(localField.options?.length || 0) + 1}`,
      },
    ];
    setLocalField({ ...localField, options: newOptions });
  };

  const updateOption = (index, key, value) => {
    const newOptions = [...(localField.options || [])];
    newOptions[index] = { ...newOptions[index], [key]: value };
    setLocalField({ ...localField, options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = localField.options?.filter((_, i) => i !== index) || [];
    setLocalField({ ...localField, options: newOptions });
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">ویرایش فیلد</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <FaTimes />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            برچسب فیلد *
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) =>
              setLocalField({ ...localField, label: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {["text", "textarea", "number", "email", "tel"].includes(
          field.type
        ) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              متن راهنما
            </label>
            <input
              type="text"
              value={localField.placeholder || ""}
              onChange={(e) =>
                setLocalField({ ...localField, placeholder: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            توضیحات
          </label>
          <input
            type="text"
            value={localField.description || ""}
            onChange={(e) =>
              setLocalField({ ...localField, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localField.required || false}
              onChange={(e) =>
                setLocalField({ ...localField, required: e.target.checked })
              }
              className="ml-2"
            />
            <span className="text-sm">فیلد اجباری</span>
          </label>
        </div>
      </div>

      {/* Options for select, radio, checkbox */}
      {["select", "radio", "checkbox"].includes(field.type) && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              گزینه‌ها
            </label>
            <button
              onClick={addOption}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              <FaPlus className="inline ml-1" />
              افزودن گزینه
            </button>
          </div>
          <div className="space-y-2">
            {(localField.options || []).map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => updateOption(index, "label", e.target.value)}
                  placeholder="برچسب گزینه"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={option.value}
                  onChange={(e) => updateOption(index, "value", e.target.value)}
                  placeholder="مقدار"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeOption(index)}
                  className="text-red-600 hover:text-red-800 px-2"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation settings */}
      {["text", "textarea", "number"].includes(field.type) && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اعتبارسنجی
          </label>
          <div className="grid grid-cols-2 gap-4">
            {field.type === "number" ? (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    حداقل مقدار
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.min || ""}
                    onChange={(e) =>
                      setLocalField({
                        ...localField,
                        validation: {
                          ...localField.validation,
                          min: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    حداکثر مقدار
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.max || ""}
                    onChange={(e) =>
                      setLocalField({
                        ...localField,
                        validation: {
                          ...localField.validation,
                          max: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    حداقل طول
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.minLength || ""}
                    onChange={(e) =>
                      setLocalField({
                        ...localField,
                        validation: {
                          ...localField.validation,
                          minLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    حداکثر طول
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.maxLength || ""}
                    onChange={(e) =>
                      setLocalField({
                        ...localField,
                        validation: {
                          ...localField.validation,
                          maxLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          انصراف
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ذخیره
        </button>
      </div>
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
          </div>
        );

      default:
        return <div className="text-gray-400">نوع فیلد نامشخص</div>;
    }
  };

  return (
    <div>
      {field.description && (
        <p className="text-sm text-gray-600 mb-2">{field.description}</p>
      )}
      {renderField()}
    </div>
  );
}

// Form Preview Component
function FormPreview({ formData }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {formData.title || "عنوان فرم"}
        </h2>
        {formData.description && (
          <p className="text-gray-600">{formData.description}</p>
        )}
      </div>

      {formData.settings.showProgressBar && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full w-0"></div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            0 از {formData.fields.length} فیلد
          </p>
        </div>
      )}

      <form className="space-y-6">
        {formData.fields.map((field, index) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            {field.description && (
              <p className="text-sm text-gray-600 mb-2">{field.description}</p>
            )}
            <FieldPreview field={field} />
          </div>
        ))}

        <div className="pt-6">
          <button
            type="button"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            {formData.settings.submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
}
