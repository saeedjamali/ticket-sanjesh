"use client";

import { useState, useEffect, useCallback } from "react";
import StatusTimelineModal from "@/components/modals/StatusTimelineModal";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaIdCard,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaSpinner,
  FaEye,
  FaCross,
  FaFileExcel,
  FaUpload,
  FaDownload,
  FaCloudUploadAlt,
  FaFileImport,
  FaHistory,
  FaCog,
  FaColumns,
} from "react-icons/fa";

export default function TransferApplicantSpecsPage() {
  const { user, loading: userLoading } = useUserContext();

  // States
  const [specs, setSpecs] = useState([]);
  const [helpers, setHelpers] = useState({
    districts: [],
    employmentFields: [],
    employmentTypes: [],
    genders: [],
    transferTypes: [],
    destinationTransferTypes: [],
    finalDestinationTransferTypes: [],
    currentTransferStatuses: [],
    requestStatuses: [],
    medicalCommissionCodes: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [helpersLoading, setHelpersLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filters, setFilters] = useState({
    employmentField: "",
    gender: "",
    transferType: "",
    currentWorkPlace: "",
    sourceDistrict: "",
    currentTransferStatus: "",
    requestStatus: "",
    medicalCommissionCode: "",
    scoreMin: "",
    scoreMax: "",
    yearsMin: "",
    yearsMax: "",
    isActive: "",
    createdDateFrom: "",
    createdDateTo: "",
  });
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedSpecForTimeline, setSelectedSpecForTimeline] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // تعریف ستون‌های موجود
  const availableColumns = [
    { key: "personnelCode", label: "کد پرسنلی", default: true },
    { key: "fullName", label: "نام و نام خانوادگی", default: true },
    { key: "nationalId", label: "کد ملی", default: true },
    { key: "employmentType", label: "نوع استخدام", default: true },
    { key: "gender", label: "جنسیت", default: false },
    { key: "mobile", label: "شماره تماس", default: false },
    { key: "effectiveYears", label: "سنوات مؤثر", default: false },
    { key: "employmentField", label: "رشته شغلی", default: false },
    { key: "fieldCode", label: "کد رشته", default: false },
    { key: "approvedScore", label: "امتیاز تایید شده", default: false },
    {
      key: "requestedTransferType",
      label: "نوع انتقال درخواستی",
      default: true,
    },
    {
      key: "sourceOpinionTransferType",
      label: "نظر مبدا نوع انتقال",
      default: false,
    },
    { key: "currentWorkPlaceCode", label: "کد محل خدمت", default: true },
    { key: "sourceDistrictCode", label: "کد مبدا", default: false },
    { key: "destinationPriority1", label: "اولویت مقصد 1", default: true },
    { key: "destinationPriority2", label: "اولویت مقصد 2", default: false },
    { key: "destinationPriority3", label: "اولویت مقصد 3", default: false },
    { key: "currentTransferStatus", label: "وضعیت فعلی انتقال", default: true },
    { key: "requestStatus", label: "وضعیت درخواست", default: true },
    { key: "medicalCommissionCode", label: "کد کمیسیون پزشکی", default: false },
    { key: "finalDestination", label: "مقصد نهایی", default: false },
    { key: "isActive", label: "وضعیت فعال بودن", default: true },
    { key: "createdAt", label: "تاریخ ایجاد", default: false },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => {
    // بارگذاری از localStorage یا استفاده از تنظیمات پیش‌فرض
    const saved = localStorage.getItem("transfer-specs-visible-columns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return availableColumns
          .filter((col) => col.default)
          .map((col) => col.key);
      }
    }
    return availableColumns.filter((col) => col.default).map((col) => col.key);
  });
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    personnelCode: "",
    nationalId: "",
    employmentType: "official",
    gender: "male",
    mobile: "",
    effectiveYears: 0,
    selectedEmploymentField: "",
    employmentField: "",
    fieldCode: "",
    approvedScore: 0,
    requestedTransferType: "permanent",
    currentWorkPlaceCode: "",
    sourceDistrictCode: "",
    destinationPriority1: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority2: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority3: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority4: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority5: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority6: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    destinationPriority7: {
      districtCode: "",
      transferType: "permanent_preferred",
    },
    currentTransferStatus: 1,
    requestStatus: "awaiting_user_approval",
    medicalCommissionCode: "",
    medicalCommissionVerdict: "",
    finalDestination: { districtCode: "", transferType: "permanent" },
    canEditDestination: true,
    isActive: true,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchHelpers = async () => {
    try {
      setHelpersLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/transfer-applicant-specs/helpers", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setHelpers(data);
      } else {
        toast.error(data.error || "خطا در دریافت اطلاعات کمکی");
      }
    } catch (error) {
      console.error("Error fetching helpers:", error);
      toast.error("خطا در دریافت اطلاعات کمکی");
    } finally {
      setHelpersLoading(false);
    }
  };

  const fetchSpecs = useCallback(
    async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setSearchLoading(true);
        }
        const accessToken = localStorage.getItem("accessToken");
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "10",
          ...(debouncedSearchTerm &&
            debouncedSearchTerm.length >= 4 && { search: debouncedSearchTerm }),
          ...(statusFilter && { status: statusFilter }),
          ...(filters.requestStatus && {
            currentRequestStatus: filters.requestStatus, // استفاده از فیلد جدید
          }),
          ...(filters.employmentField && {
            fieldCode: filters.employmentField,
          }),
          ...(filters.gender && { gender: filters.gender }),
          ...(sortBy && { sortBy: sortBy }),
          ...(sortBy && sortOrder && { sortOrder: sortOrder }),
          // فیلتر منطقه برای کارشناس منطقه
          ...(user?.role === "districtTransferExpert" &&
            user?.district && {
              currentWorkPlaceCode: user.district,
            }),
          // نوت: فیلتر استانی برای کارشناس استان در سمت سرور اعمال می‌شود
        });

        const response = await fetch(
          `/api/transfer-applicant-specs?${params}`,
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
          setSpecs(data.specs);
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.totalItems);
        } else {
          toast.error(data.error || "خطا در دریافت مشخصات پرسنل");
        }
      } catch (error) {
        console.error("Error fetching specs:", error);
        toast.error("خطا در دریافت مشخصات پرسنل");
      } finally {
        setLoading(false);
        setSearchLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearchTerm,
      statusFilter,
      filters.requestStatus,
      filters.employmentField,
      filters.gender,
      sortBy,
      sortOrder,
      user?.role,
      user?.district,
    ]
  );

  useEffect(() => {
    if (user) {
      fetchHelpers();
      // اولین بار که user لود می‌شود و هیچ فیلتری نیست، initial load است
      const isInitialLoad =
        specs.length === 0 &&
        currentPage === 1 &&
        !debouncedSearchTerm &&
        !statusFilter &&
        !filters.requestStatus &&
        !filters.employmentField &&
        !filters.gender &&
        !sortBy;
      fetchSpecs(isInitialLoad);
    }
  }, [
    user,
    fetchSpecs,
    specs.length,
    currentPage,
    debouncedSearchTerm,
    statusFilter,
    filters.requestStatus,
    filters.employmentField,
    filters.gender,
    sortBy,
  ]);

  // خودکار پر کردن فیلدهای منطقه برای کارشناس منطقه
  useEffect(() => {
    if (
      user?.role === "districtTransferExpert" &&
      user?.district?.code &&
      showModal
    ) {
      setFormData((prev) => ({
        ...prev,
        currentWorkPlaceCode: user.district.code,
        sourceDistrictCode: user.district.code,
      }));
    }
  }, [user?.role, user?.district?.code, showModal]);

  // تابع helper برای validate کردن کد منطقه
  const validateDistrictCode = (code) => {
    const district = helpers.districts.find((d) => d.code === code);
    return district !== undefined;
  };

  // توابع مدیریت ستون‌ها
  const handleColumnToggle = (columnKey) => {
    const newVisibleColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter((col) => col !== columnKey)
      : [...visibleColumns, columnKey];

    setVisibleColumns(newVisibleColumns);
    localStorage.setItem(
      "transfer-specs-visible-columns",
      JSON.stringify(newVisibleColumns)
    );
  };

  const handleResetColumns = () => {
    const defaultColumns = availableColumns
      .filter((col) => col.default)
      .map((col) => col.key);
    setVisibleColumns(defaultColumns);
    localStorage.setItem(
      "transfer-specs-visible-columns",
      JSON.stringify(defaultColumns)
    );
  };

  const handleSelectAllColumns = () => {
    const allColumns = availableColumns.map((col) => col.key);
    setVisibleColumns(allColumns);
    localStorage.setItem(
      "transfer-specs-visible-columns",
      JSON.stringify(allColumns)
    );
  };

  // تابع helper برای render کردن مقدار هر ستون
  const renderColumnValue = (spec, columnKey) => {
    switch (columnKey) {
      case "personnelCode":
        return spec.personnelCode;
      case "fullName":
        return (
          <div className="flex items-center gap-2">
            <FaUser className="h-4 w-4 text-gray-400" />
            {`${spec.firstName} ${spec.lastName}`}
          </div>
        );
      case "nationalId":
        return spec.nationalId || "-";
      case "employmentType":
        const empType = helpers.employmentTypes.find(
          (type) => type.value === spec.employmentType
        );
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {empType?.label || spec.employmentType}
          </span>
        );
      case "gender":
        return spec.gender === "male" ? "مرد" : "زن";
      case "mobile":
        return spec.mobile ? (
          <div className="flex items-center justify-center gap-1">
            <FaPhone className="h-3 w-3 text-gray-400" />
            {spec.mobile}
          </div>
        ) : (
          "-"
        );
      case "effectiveYears":
        return spec.effectiveYears;
      case "employmentField":
        return spec.employmentField || "-";
      case "fieldCode":
        return spec.fieldCode || "-";
      case "approvedScore":
        return spec.approvedScore;
      case "requestedTransferType":
        return spec.requestedTransferType === "permanent" ? "دائم" : "موقت";
      case "sourceOpinionTransferType":
        return spec.sourceOpinionTransferType === "permanent"
          ? "دائم"
          : spec.sourceOpinionTransferType === "temporary"
          ? "موقت"
          : "-";
      case "currentWorkPlaceCode":
        return spec.currentWorkPlaceCode || "-";
      case "sourceDistrictCode":
        return spec.sourceDistrictCode || "-";
      case "destinationPriority1":
        return spec.destinationPriority1?.districtCode || "-";
      case "destinationPriority2":
        return spec.destinationPriority2?.districtCode || "-";
      case "destinationPriority3":
        return spec.destinationPriority3?.districtCode || "-";
      case "currentTransferStatus":
        const statusMap = {
          1: "منتقل نشده در پردازش",
          2: "منتقل شده پردازشی",
          3: "ثبت نام ناقص",
          4: "رد درخواست توسط منطقه مبدا",
        };
        const statusText =
          statusMap[spec.currentTransferStatus] || spec.currentTransferStatus;
        const statusColor =
          spec.currentTransferStatus === 2
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            {statusText}
          </span>
        );
      case "requestStatus":
        // استفاده از currentRequestStatus جدید
        const currentStatus = spec.currentRequestStatus || spec.requestStatus;
        const reqStatus = helpers.requestStatuses.find(
          (status) => status.value === currentStatus
        );

        // نمایش تاریخچه workflow در tooltip
        const hasWorkflow =
          spec.requestStatusWorkflow && spec.requestStatusWorkflow.length > 0;
        const workflowTooltip = hasWorkflow
          ? `تاریخچه تغییرات: ${spec.requestStatusWorkflow.length} مورد`
          : "";

        return (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              title={workflowTooltip}
            >
              {reqStatus?.label || currentStatus}
            </span>
            {hasWorkflow && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                {spec.requestStatusWorkflow.length}
              </span>
            )}
          </div>
        );
      case "medicalCommissionCode":
        return spec.medicalCommissionCode || "-";
      case "finalDestination":
        return spec.finalDestination?.districtCode || "-";
      case "isActive":
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              spec.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {spec.isActive ? "فعال" : "غیرفعال"}
          </span>
        );
      case "createdAt":
        return new Date(spec.createdAt).toLocaleDateString("fa-IR");
      default:
        return "-";
    }
  };

  const handleSubmitDistrictEdit = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      // فقط فیلدهای مجاز برای کارشناس منطقه
      const allowedData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        personnelCode: formData.personnelCode,
        nationalId: formData.nationalId,
        gender: formData.gender,
        mobile: formData.mobile,
        employmentType: formData.employmentType,
        effectiveYears: formData.effectiveYears,
        employmentField: formData.employmentField,
        fieldCode: formData.fieldCode,
        approvedScore: formData.approvedScore,
        requestedTransferType: formData.requestedTransferType,
        // اضافه کردن فیلدهای اجباری منطقه
        currentWorkPlaceCode: user?.district?.code,
        sourceDistrictCode: user?.district?.code,
        // اضافه کردن وضعیت درخواست
        currentRequestStatus: formData.requestStatus,
      };

      const url = editingSpec
        ? `/api/transfer-applicant-specs`
        : `/api/transfer-applicant-specs`;

      const method = editingSpec ? "PUT" : "POST";

      // اضافه کردن id برای ویرایش
      const payload = editingSpec
        ? { ...allowedData, id: editingSpec._id }
        : allowedData;

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage = editingSpec
          ? "مشخصات پرسنل با موفقیت ویرایش شد"
          : "پرسنل جدید با موفقیت اضافه شد";
        toast.success(successMessage);
        fetchSpecs(false);
        handleCloseModal();
      } else {
        const errorMessage = editingSpec
          ? "خطا در ویرایش مشخصات"
          : "خطا در اضافه کردن پرسنل";
        toast.error(data.error || errorMessage);
      }
    } catch (error) {
      console.error("Error submitting spec:", error);
      const errorMessage = editingSpec
        ? "خطا در ویرایش مشخصات"
        : "خطا در اضافه کردن پرسنل";
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.personnelCode.trim() ||
      !formData.mobile.trim() ||
      !formData.selectedEmploymentField.trim() ||
      !formData.employmentField.trim() ||
      !formData.fieldCode.trim() ||
      !formData.currentWorkPlaceCode.trim() ||
      !formData.sourceDistrictCode.trim()
    ) {
      toast.error("لطفاً همه فیلدهای ضروری را پر کنید");
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = "/api/transfer-applicant-specs";
      const method = editingSpec ? "PUT" : "POST";

      // حذف فیلدهای خالی از اولویت‌ها
      const cleanedFormData = { ...formData };
      [1, 2, 3, 4, 5, 6, 7].forEach((priority) => {
        const key = `destinationPriority${priority}`;
        if (cleanedFormData[key] && !cleanedFormData[key].districtCode) {
          delete cleanedFormData[key];
        }
      });

      if (
        cleanedFormData.finalDestination &&
        !cleanedFormData.finalDestination.districtCode
      ) {
        delete cleanedFormData.finalDestination;
      }

      // تبدیل requestStatus به currentRequestStatus برای API
      const apiFormData = { ...cleanedFormData };
      if (apiFormData.requestStatus) {
        apiFormData.currentRequestStatus = apiFormData.requestStatus;
        delete apiFormData.requestStatus;
      }

      const payload = editingSpec
        ? { ...apiFormData, id: editingSpec._id }
        : apiFormData;

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
          editingSpec
            ? "مشخصات پرسنل با موفقیت ویرایش شد"
            : "مشخصات پرسنل با موفقیت ایجاد شد"
        );
        fetchSpecs(false);
        handleCloseModal();
      } else {
        toast.error(data.error || "خطا در عملیات");
      }
    } catch (error) {
      console.error("Error saving spec:", error);
      toast.error("خطا در ذخیره مشخصات پرسنل");
    }
  };

  const handleViewTimeline = (spec) => {
    setSelectedSpecForTimeline({
      id: spec._id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      personnelCode: spec.personnelCode,
      nationalId: spec.nationalId,
    });
    setShowTimelineModal(true);
  };

  const handleEdit = (spec) => {
    setEditingSpec(spec);
    setFormData({
      firstName: spec.firstName,
      lastName: spec.lastName,
      personnelCode: spec.personnelCode,
      nationalId: spec.nationalId || "",
      employmentType: spec.employmentType,
      gender: spec.gender,
      mobile: spec.mobile,
      effectiveYears: spec.effectiveYears,
      selectedEmploymentField: spec.fieldCode
        ? `${spec.fieldCode}-${spec.employmentField}`
        : "",
      employmentField: spec.employmentField,
      fieldCode: spec.fieldCode,
      approvedScore: spec.approvedScore,
      requestedTransferType: spec.requestedTransferType,
      currentWorkPlaceCode: spec.currentWorkPlaceCode,
      sourceDistrictCode: spec.sourceDistrictCode,
      destinationPriority1: spec.destinationPriority1
        ? {
            districtCode: spec.destinationPriority1.districtCode,
            transferType:
              spec.destinationPriority1.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority2: spec.destinationPriority2
        ? {
            districtCode: spec.destinationPriority2.districtCode,
            transferType:
              spec.destinationPriority2.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority3: spec.destinationPriority3
        ? {
            districtCode: spec.destinationPriority3.districtCode,
            transferType:
              spec.destinationPriority3.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority4: spec.destinationPriority4
        ? {
            districtCode: spec.destinationPriority4.districtCode,
            transferType:
              spec.destinationPriority4.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority5: spec.destinationPriority5
        ? {
            districtCode: spec.destinationPriority5.districtCode,
            transferType:
              spec.destinationPriority5.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority6: spec.destinationPriority6
        ? {
            districtCode: spec.destinationPriority6.districtCode,
            transferType:
              spec.destinationPriority6.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      destinationPriority7: spec.destinationPriority7
        ? {
            districtCode: spec.destinationPriority7.districtCode,
            transferType:
              spec.destinationPriority7.transferType || "permanent_preferred",
          }
        : {
            districtCode: "",
            transferType: "permanent_preferred",
          },
      currentTransferStatus: spec.currentTransferStatus,
      requestStatus: spec.currentRequestStatus || spec.requestStatus, // استفاده از فیلد جدید
      medicalCommissionCode: spec.medicalCommissionCode || "",
      medicalCommissionVerdict: spec.medicalCommissionVerdict || "",
      finalDestination: spec.finalDestination
        ? {
            districtCode: spec.finalDestination.districtCode,
            transferType: spec.finalDestination.transferType || "permanent",
          }
        : {
            districtCode: "",
            transferType: "permanent",
          },
      canEditDestination: spec.canEditDestination,
      isActive: spec.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (specId) => {
    if (!confirm("آیا از حذف این مشخصات پرسنل اطمینان دارید؟")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/transfer-applicant-specs?id=${specId}`,
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
        toast.success("مشخصات پرسنل با موفقیت حذف شد");
        fetchSpecs(false);
      } else {
        toast.error(data.error || "خطا در حذف مشخصات پرسنل");
      }
    } catch (error) {
      console.error("Error deleting spec:", error);
      toast.error("خطا در حذف مشخصات پرسنل");
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile) {
      toast.error("لطفاً فایل اکسل را انتخاب کنید");
      return;
    }

    try {
      setUploading(true);
      const accessToken = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/transfer-applicant-specs/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResults(data.results);
        toast.success(data.message);
        fetchSpecs(false); // بروزرسانی لیست
        if (data.results.errors.length === 0) {
          setShowUploadModal(false);
          setUploadFile(null);
        }
      } else {
        toast.error(data.error || "خطا در بارگذاری فایل");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("خطا در بارگذاری فایل");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // بررسی نوع فایل
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("فقط فایل‌های اکسل (.xlsx, .xls) مجاز هستند");
        return;
      }

      setUploadFile(file);
      setUploadResults(null);
    }
  };

  const downloadTemplate = () => {
    // ایجاد فایل نمونه اکسل کامل
    const templateData = [
      {
        // اطلاعات شخصی
        نام: "علی",
        "نام خانوادگی": "احمدی",
        "کد پرسنلی": "12345678",
        "کد ملی": "1234567890",
        "نوع استخدام": "رسمی", // رسمی، پیمانی، حق التدریس، قراردادی، آزمایشی
        جنسیت: "مرد", // مرد، زن
        "تلفن همراه": "09123456789",

        // اطلاعات شغلی
        "سنوات مؤثر": "5",
        "رشته استخدامی": "ریاضی",
        "کد رشته": "101",
        "امتیاز تایید شده": "85.5",
        "نوع انتقال تقاضا": "دائم", // دائم، موقت

        // اطلاعات مکانی
        "کد محل خدمت": "1001",
        "کد مبدا": "1001",

        // اولویت‌های مقصد (فقط کد منطقه)
        "مقصد اولویت 1": "1002",
        "مقصد اولویت 2": "1003",
        "مقصد اولویت 3": "1004",
        "مقصد اولویت 4": "1005",
        "مقصد اولویت 5": "1006",
        "مقصد اولویت 6": "1007",
        "مقصد اولویت 7": "1008",

        // وضعیت‌ها
        "وضعیت فعلی انتقال": "1", // 1=منتقل نشده، 2=منتقل شده، 3=ثبت نام ناقص، 4=رد درخواست
        "وضعیت درخواست": "awaiting_user_approval",
        "کد رای کمیسیون پزشکی": "1", // 1، 11، 2، 3، 4، 5
        "رای کمیسیون پزشکی":
          "انتقال به نزدیکترین محل مورد تقاضا بصورت دائم ضرورت دارد",

        // مقصد نهایی
        "مقصد نهایی": "1002",
        "نوع انتقال نهایی": "permanent", // permanent، temporary

        // سایر تنظیمات
        "امکان ویرایش مقصد": "بله", // بله، خیر
        "وضعیت فعال": "بله", // بله، خیر
      },
    ];

    // ایجاد شیت راهنما
    const guideData = [
      {
        فیلد: "نام",
        توضیحات: "نام پرسنل",
        نوع: "متن",
        الزامی: "بله",
        مثال: "علی",
      },
      {
        فیلد: "نام خانوادگی",
        توضیحات: "نام خانوادگی پرسنل",
        نوع: "متن",
        الزامی: "بله",
        مثال: "احمدی",
      },
      {
        فیلد: "کد پرسنلی",
        توضیحات: "کد پرسنلی 8 رقمی",
        نوع: "عدد",
        الزامی: "بله",
        مثال: "12345678",
      },
      {
        فیلد: "کد ملی",
        توضیحات: "کد ملی 8 تا 10 رقمی",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1234567890",
      },
      {
        فیلد: "نوع استخدام",
        توضیحات: "نوع استخدام پرسنل",
        نوع: "انتخابی",
        الزامی: "بله",
        مثال: "رسمی، پیمانی، حق التدریس، قراردادی، آزمایشی",
      },
      {
        فیلد: "جنسیت",
        توضیحات: "جنسیت پرسنل",
        نوع: "انتخابی",
        الزامی: "بله",
        مثال: "مرد، زن",
      },
      {
        فیلد: "تلفن همراه",
        توضیحات: "شماره تلفن همراه 11 رقمی",
        نوع: "متن",
        الزامی: "بله",
        مثال: "09123456789",
      },
      {
        فیلد: "سنوات مؤثر",
        توضیحات: "سنوات مؤثر خدمت",
        نوع: "عدد",
        الزامی: "خیر",
        مثال: "5",
      },
      {
        فیلد: "رشته استخدامی",
        توضیحات: "رشته تحصیلی/استخدامی",
        نوع: "متن",
        الزامی: "بله",
        مثال: "ریاضی",
      },
      {
        فیلد: "کد رشته",
        توضیحات: "کد رشته استخدامی",
        نوع: "متن",
        الزامی: "بله",
        مثال: "101",
      },
      {
        فیلد: "امتیاز تایید شده",
        توضیحات: "امتیاز تایید شده پرسنل",
        نوع: "عدد اعشاری",
        الزامی: "خیر",
        مثال: "85.5",
      },
      {
        فیلد: "نوع انتقال تقاضا",
        توضیحات: "نوع انتقال درخواستی",
        نوع: "انتخابی",
        الزامی: "بله",
        مثال: "دائم، موقت",
      },
      {
        فیلد: "کد محل خدمت",
        توضیحات: "کد منطقه محل خدمت فعلی",
        نوع: "متن",
        الزامی: "بله",
        مثال: "1001",
      },
      {
        فیلد: "کد مبدا",
        توضیحات: "کد منطقه مبدا",
        نوع: "متن",
        الزامی: "بله",
        مثال: "1001",
      },
      {
        فیلد: "مقصد اولویت 1",
        توضیحات: "کد منطقه اولویت اول",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1002",
      },
      {
        فیلد: "مقصد اولویت 2",
        توضیحات: "کد منطقه اولویت دوم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1003",
      },
      {
        فیلد: "مقصد اولویت 3",
        توضیحات: "کد منطقه اولویت سوم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1004",
      },
      {
        فیلد: "مقصد اولویت 4",
        توضیحات: "کد منطقه اولویت چهارم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1005",
      },
      {
        فیلد: "مقصد اولویت 5",
        توضیحات: "کد منطقه اولویت پنجم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1006",
      },
      {
        فیلد: "مقصد اولویت 6",
        توضیحات: "کد منطقه اولویت ششم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1007",
      },
      {
        فیلد: "مقصد اولویت 7",
        توضیحات: "کد منطقه اولویت هفتم",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1008",
      },
      {
        فیلد: "وضعیت فعلی انتقال",
        توضیحات: "وضعیت فعلی انتقال",
        نوع: "عدد",
        الزامی: "خیر",
        مثال: "1=منتقل نشده، 2=منتقل شده، 3=ثبت نام ناقص، 4=رد درخواست",
      },
      {
        فیلد: "وضعیت درخواست",
        توضیحات: "وضعیت درخواست تجدیدنظر در نتیجه انتقال",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "awaiting_user_approval",
      },
      {
        فیلد: "کد رای کمیسیون پزشکی",
        توضیحات: "کد رای کمیسیون پزشکی",
        نوع: "عدد",
        الزامی: "خیر",
        مثال: "1، 11، 2، 3، 4، 5",
      },
      {
        فیلد: "رای کمیسیون پزشکی",
        توضیحات: "متن رای کمیسیون پزشکی",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "انتقال ضرورت دارد",
      },
      {
        فیلد: "مقصد نهایی",
        توضیحات: "کد منطقه مقصد نهایی",
        نوع: "متن",
        الزامی: "خیر",
        مثال: "1002",
      },
      {
        فیلد: "نوع انتقال نهایی",
        توضیحات: "نوع انتقال نهایی",
        نوع: "انتخابی",
        الزامی: "خیر",
        مثال: "permanent، temporary",
      },
      {
        فیلد: "امکان ویرایش مقصد",
        توضیحات: "آیا امکان ویرایش مقصد وجود دارد",
        نوع: "انتخابی",
        الزامی: "خیر",
        مثال: "بله، خیر",
      },
      {
        فیلد: "وضعیت فعال",
        توضیحات: "وضعیت فعال بودن پرسنل",
        نوع: "انتخابی",
        الزامی: "خیر",
        مثال: "بله، خیر",
      },
    ];

    // ایجاد شیت کدهای منطقه (نمونه)
    const districtCodes = [
      { "کد منطقه": "1001", "نام منطقه": "منطقه 1 مشهد", استان: "خراسان رضوی" },
      { "کد منطقه": "1002", "نام منطقه": "منطقه 2 مشهد", استان: "خراسان رضوی" },
      { "کد منطقه": "1003", "نام منطقه": "منطقه 3 مشهد", استان: "خراسان رضوی" },
      {
        "کد منطقه": "1004",
        "نام منطقه": "منطقه نیشابور",
        استان: "خراسان رضوی",
      },
      { "کد منطقه": "1005", "نام منطقه": "منطقه سبزوار", استان: "خراسان رضوی" },
      {
        "کد منطقه": "...",
        "نام منطقه":
          "برای دریافت لیست کامل کدهای مناطق با مدیر سیستم تماس بگیرید",
        استان: "...",
      },
    ];

    const templateWorksheet = XLSX.utils.json_to_sheet(templateData);
    const guideWorksheet = XLSX.utils.json_to_sheet(guideData);
    const districtsWorksheet = XLSX.utils.json_to_sheet(districtCodes);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, templateWorksheet, "نمونه داده");
    XLSX.utils.book_append_sheet(workbook, guideWorksheet, "راهنمای فیلدها");
    XLSX.utils.book_append_sheet(workbook, districtsWorksheet, "کدهای منطقه");

    XLSX.writeFile(workbook, "نمونه_مشخصات_پرسنل_کامل.xlsx");
  };

  // Export آمار وضعیت‌ها برای کارشناس استان
  const exportStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transfer-applicant-specs/statistics");
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "خطا در دریافت آمار");
        return;
      }

      const { statistics, statuses, workPlaceData } = result.data;

      // Debug: چاپ داده‌های دریافتی
      console.log("API Response:", result.data);
      console.log("Statuses:", statuses);
      console.log("WorkPlace Data:", workPlaceData);
      console.log("Statistics:", statistics);

      // تبدیل وضعیت‌ها به فارسی
      const statusMap = {
        user_no_action: "عدم اقدام کاربر",
        awaiting_user_approval: "در انتظار تایید کاربر",
        user_approval: "تایید کاربر",
        source_review: "در حال بررسی مبدا",
        exception_eligibility_approval: "تایید مشمولیت استثنا",
        exception_eligibility_rejection: "رد مشمولیت استثنا",
        source_approval: "موافقت مبدا",
        source_rejection: "مخالفت مبدا",  
        province_review: "در حال بررسی استان",
        province_approval: "موافقت استان",
        province_rejection: "مخالفت استان",
        destination_review: "در حال بررسی مقصد",
        destination_approval: "تایید مقصد",
        destination_rejection: "رد مقصد",
      };

      console.log("Total statuses received:", statuses.length);
      console.log("Status list:", statuses);

      const statusHeaders = statuses.map(
        (status) => statusMap[status] || status
      );

      // ایجاد header row با کد و نام منطقه جداگانه
      const headerRow = ["کد منطقه", "نام منطقه", ...statusHeaders];

      console.log("Header Row:", headerRow);

      // ایجاد rows داده‌ها
      const dataRows = workPlaceData.map((district) => {
        const row = [district.code, district.name];
        statuses.forEach((status) => {
          row.push(statistics[district.code][status] || 0);
        });
        console.log("Data Row for", district.name, ":", row);
        return row;
      });

      // ترکیب header و data
      const excelData = [headerRow, ...dataRows];
      console.log("Final Excel Data:", excelData);

      // ایجاد worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // تنظیم عرض ستون‌ها
      const columnWidths = [
        { wch: 12 }, // کد منطقه
        { wch: 25 }, // نام منطقه
        ...statuses.map(() => ({ wch: 15 })), // وضعیت‌ها
      ];
      worksheet["!cols"] = columnWidths;

      // ایجاد workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "آمار وضعیت‌ها");

      // دانلود فایل
      const fileName = `آمار_وضعیت_مناطق_${new Date()
        .toLocaleDateString("fa-IR")
        .replace(/\//g, "_")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("فایل آمار با موفقیت دانلود شد");
    } catch (error) {
      console.error("خطا در export آمار:", error);
      toast.error("خطا در تولید فایل آمار");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSpec(null);
    setFormData({
      firstName: "",
      lastName: "",
      personnelCode: "",
      nationalId: "",
      employmentType: "official",
      gender: "male",
      mobile: "",
      effectiveYears: 0,
      selectedEmploymentField: "",
      employmentField: "",
      fieldCode: "",
      approvedScore: 0,
      requestedTransferType: "permanent",
      currentWorkPlaceCode: "",
      sourceDistrictCode: "",
      destinationPriority1: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority2: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority3: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority4: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority5: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority6: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      destinationPriority7: {
        districtCode: "",
        transferType: "permanent_preferred",
      },
      currentTransferStatus: 1,
      requestStatus: "awaiting_user_approval",
      medicalCommissionCode: "",
      medicalCommissionVerdict: "",
      finalDestination: { districtCode: "", transferType: "permanent" },
      canEditDestination: true,
      isActive: true,
    });
  };

  const getDistrictName = (code) => {
    const district = helpers.districts.find((d) => d.code === code);
    return district ? `${district.name} (${code})` : code;
  };

  const getEmploymentTypeText = (type) => {
    const employmentType = helpers.employmentTypes.find(
      (e) => e.value === type
    );
    return employmentType ? employmentType.label : type;
  };

  const getGenderText = (gender) => {
    const genderType = helpers.genders.find((g) => g.value === gender);
    return genderType ? genderType.label : gender;
  };

  const getCurrentTransferStatusText = (status) => {
    const statusType = helpers.currentTransferStatuses.find(
      (s) => s.value === status
    );
    return statusType ? statusType.label : status;
  };

  const getRequestStatusText = (status) => {
    const statusType = helpers.requestStatuses.find((s) => s.value === status);
    return statusType ? statusType.label : status;
  };

  // تابع جدید برای نمایش تاریخچه workflow
  const getWorkflowHistory = (workflow) => {
    if (!workflow || workflow.length === 0) return [];

    return workflow
      .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
      .map((item, index) => ({
        ...item,
        statusText: getRequestStatusText(item.status),
        previousStatusText: item.previousStatus
          ? getRequestStatusText(item.previousStatus)
          : null,
        isLatest: index === workflow.length - 1,
      }));
  };

  // تابع helper برای فیلتر کردن مناطق قابل انتخاب برای اولویت‌ها
  const getAvailableDistricts = (currentPriority) => {
    const selectedDistricts = [];

    // منطقه محل خدمت و مبدا را حذف کن
    if (formData.currentWorkPlaceCode) {
      selectedDistricts.push(formData.currentWorkPlaceCode);
    }
    if (formData.sourceDistrictCode) {
      selectedDistricts.push(formData.sourceDistrictCode);
    }

    // مناطق انتخاب شده در اولویت‌های قبلی را حذف کن
    for (let i = 1; i < currentPriority; i++) {
      const priority = `destinationPriority${i}`;
      if (formData[priority] && formData[priority].districtCode) {
        selectedDistricts.push(formData[priority].districtCode);
      }
    }

    // مناطق انتخاب شده در اولویت‌های بعدی را حذف کن
    for (let i = currentPriority + 1; i <= 7; i++) {
      const priority = `destinationPriority${i}`;
      if (formData[priority] && formData[priority].districtCode) {
        selectedDistricts.push(formData[priority].districtCode);
      }
    }

    return (
      helpers.districts?.filter(
        (district) => !selectedDistricts.includes(district.code)
      ) || []
    );
  };

  // تابع برای بررسی اینکه آیا اولویت قابل فعالسازی است یا نه
  const isPriorityEnabled = (priority) => {
    if (priority === 1) return true; // اولویت 1 همیشه فعال است

    // برای اولویت‌های بعدی، اولویت قبلی باید پر شده باشد
    // اولویت 4 باید اولویت 3 پر شده باشد
    let previousPriority;
    if (priority === 4) {
      previousPriority = "destinationPriority3";
    } else {
      previousPriority = `destinationPriority${priority - 1}`;
    }

    return (
      formData[previousPriority] && formData[previousPriority].districtCode
    );
  };

  // از آنجایی که filter و search در server انجام می‌شود، دیگر نیازی به client-side filtering نداریم
  const filteredSpecs = specs;

  // بررسی دسترسی
  if (
    !userLoading &&
    (!user ||
      ![
        "systemAdmin",
        "provinceTransferExpert",
        "districtTransferExpert",
      ].includes(user.role))
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  if (userLoading || (loading && specs.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 forced-color-text-black">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaIdCard className="h-8 w-8" />
              </div>
              {user?.role === "districtTransferExpert"
                ? "مشاهده و ویرایش پرسنل منطقه"
                : "مدیریت مشخصات پرسنل انتقال"}
            </h1>
            <p className="mt-2 text-lg text-blue-100/80 forced-color-text-white">
              {user?.role === "districtTransferExpert"
                ? "مشاهده و ویرایش محدود اطلاعات پرسنل منطقه"
                : "مدیریت اطلاعات و مشخصات پرسنل متقاضی انتقال"}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaUser className="h-4 w-4 text-blue-200" />
                <div className="text-right">
                  <div className="text-sm font-semibold">{totalItems}</div>
                  <div className="text-xs text-blue-200">کل پرسنل</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaIdCard className="h-4 w-4 text-green-200" />
                <div className="text-right">
                  <div className="text-sm font-semibold">{specs.length}</div>
                  <div className="text-xs text-blue-200">صفحه فعلی</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <FaCheck className="h-4 w-4 text-yellow-200" />
                <div className="text-right">
                  <div className="text-sm font-semibold">{totalPages}</div>
                  <div className="text-xs text-blue-200">صفحات</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {(user?.role === "systemAdmin" ||
                user?.role === "provinceTransferExpert") && (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/20"
                  >
                    <FaPlus className="h-5 w-5" />
                    پرسنل جدید
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-green-500/80 hover:bg-green-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/20"
                  >
                    <FaFileImport className="h-5 w-5" />
                    بارگذاری اکسل
                  </button>
                </>
              )}
              {user?.role === "districtTransferExpert" && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  <FaPlus className="h-5 w-5" />
                  افزودن پرسنل منطقه
                </button>
              )}
            </div>
            {(user?.role === "systemAdmin" ||
              user?.role === "provinceTransferExpert") && (
              <>
                <button
                  onClick={downloadTemplate}
                  className="bg-orange-500/80 hover:bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/20 text-sm"
                >
                  <FaDownload className="h-4 w-4" />
                  دانلود نمونه اکسل
                </button>

                {/* دکمه آمار فقط برای کارشناس استان */}
                {user?.role === "provinceTransferExpert" && (
                  <button
                    onClick={exportStatistics}
                    disabled={loading}
                    className="bg-purple-500/80 hover:bg-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/20 text-sm"
                  >
                    <FaFileExcel className="h-4 w-4" />
                    {loading ? "در حال تولید..." : "آمار وضعیت‌ها"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2.5 rounded-lg shadow-sm">
              <FaFilter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                جستجو و فیلتر هوشمند
              </h3>
              <p className="text-sm text-gray-600 forced-color-text-gray">
                جستجوی بهینه شده برای یافتن سریع پرسنل
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* جستجو */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3 forced-color-text-black">
              <FaSearch className="inline h-4 w-4 ml-1 text-blue-500" />
              جستجوی کلی
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو: نام کامل، کد ملی، کد پرسنلی (حداقل 4 کاراکتر)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-2 pr-10 py-3 transition-all duration-200 forced-color-text-black forced-color-bg-white"
              />
              {searchTerm && searchTerm !== debouncedSearchTerm ? (
                <FaSpinner className="absolute right-3 top-4 text-blue-500 animate-spin" />
              ) : (
                <FaSearch className="absolute right-3 top-4 text-gray-400" />
              )}
            </div>
            {searchTerm && searchTerm.length < 4 && (
              <p className="text-sm text-amber-600 mt-2">
                برای جستجو حداقل 4 کاراکتر وارد کنید
              </p>
            )}
            {searchTerm &&
              searchTerm !== debouncedSearchTerm &&
              searchTerm.length >= 4 && (
                <p className="text-sm text-blue-600 mt-2">در حال جستجو...</p>
              )}
          </div>

          {/* فیلترهای سریع */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3 forced-color-text-black">
              فیلترهای سریع
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 forced-color-text-black">
                  رشته استخدامی
                </label>
                <select
                  value={filters.employmentField}
                  onChange={(e) =>
                    setFilters({ ...filters, employmentField: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 transition-all duration-200 forced-color-text-black forced-color-bg-white"
                >
                  <option value="">همه رشته‌ها</option>
                  {helpers.employmentFields?.map((field) => (
                    <option key={field.fieldCode} value={field.fieldCode}>
                      {field.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 forced-color-text-black">
                  جنسیت
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) =>
                    setFilters({ ...filters, gender: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 transition-all duration-200 forced-color-text-black forced-color-bg-white"
                >
                  <option value="">همه</option>
                  {helpers.genders?.map((gender) => (
                    <option key={gender.value} value={gender.value}>
                      {gender.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 forced-color-text-black">
                  وضعیت درخواست
                </label>
                <select
                  value={filters.requestStatus}
                  onChange={(e) =>
                    setFilters({ ...filters, requestStatus: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 transition-all duration-200 forced-color-text-black forced-color-bg-white"
                >
                  <option value="">همه</option>
                  {helpers.requestStatuses?.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 forced-color-text-black">
                  مرتب‌سازی براساس امتیاز
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 transition-all duration-200 forced-color-text-black forced-color-bg-white"
                  >
                    <option value="">بدون مرتب‌سازی</option>
                    <option value="approvedScore">امتیاز تایید شده</option>
                  </select>
                  {sortBy && (
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-20 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 transition-all duration-200 forced-color-text-black forced-color-bg-white"
                    >
                      <option value="desc">نزولی</option>
                      <option value="asc">صعودی</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    setStatusFilter("");
                    setFilters({
                      employmentField: "",
                      gender: "",
                      transferType: "",
                      currentWorkPlace: "",
                      sourceDistrict: "",
                      currentTransferStatus: "",
                      requestStatus: "",
                      medicalCommissionCode: "",
                      scoreMin: "",
                      scoreMax: "",
                      yearsMin: "",
                      yearsMax: "",
                      isActive: "",
                      createdDateFrom: "",
                      createdDateTo: "",
                    });
                    setSortBy("");
                    setSortOrder("desc");
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
                >
                  <FaTimes className="h-4 w-4" />
                  پاک کردن
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2.5 rounded-lg shadow-sm">
                <FaIdCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                  نتایج جستجو و فیلتر
                </h3>
                <p className="text-sm text-gray-600 forced-color-text-gray">
                  {specs.length} مورد از {totalItems} مورد کل (صفحه{" "}
                  {currentPage} از {totalPages})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* دکمه انتخاب ستون‌ها */}
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-sm"
                title="انتخاب ستون‌های نمایش"
              >
                <FaColumns className="h-4 w-4" />
                <span className="text-sm">ستون‌ها</span>
              </button>

              {(loading || searchLoading) && (
                <div className="flex items-center gap-2 text-blue-600">
                  <FaSpinner className="animate-spin h-4 w-4" />
                  <span className="text-sm">
                    {loading ? "در حال بارگذاری..." : "در حال جستجو..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel انتخاب ستون‌ها */}
        {showColumnSelector && (
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-800 forced-color-text-black">
                  انتخاب ستون‌های نمایش
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetColumns}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    پیش‌فرض
                  </button>
                  <button
                    onClick={handleSelectAllColumns}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    انتخاب همه
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {availableColumns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => handleColumnToggle(column.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 forced-color-text-black">
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                <span>
                  {visibleColumns.length} ستون انتخاب شده از{" "}
                  {availableColumns.length} ستون
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {specs.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FaIdCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2 forced-color-text-black">
                هیچ پرسنلی در سیستم وجود ندارد
              </h3>
              <p className="text-gray-500 mb-6 forced-color-text-gray">
                برای شروع، اولین پرسنل را ایجاد کرده یا فایل اکسل بارگذاری کنید
              </p>
              <div className="flex justify-center gap-3">
                {(user?.role === "systemAdmin" ||
                  user?.role === "provinceTransferExpert") && (
                  <>
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FaPlus className="h-4 w-4" />
                      افزودن پرسنل
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FaUpload className="h-4 w-4" />
                      بارگذاری اکسل
                    </button>
                  </>
                )}
                {user?.role === "districtTransferExpert" && (
                  <div className="text-center">
                    <p className="text-gray-500 mb-4">
                      هیچ پرسنلی برای منطقه شما ثبت نشده است
                    </p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors mx-auto"
                    >
                      <FaPlus className="h-4 w-4" />
                      افزودن اولین پرسنل
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : filteredSpecs.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FaSearch className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2 forced-color-text-black">
                نتیجه‌ای برای جستجوی شما یافت نشد
              </h3>
              <p className="text-gray-500 mb-6 forced-color-text-gray">
                لطفاً کلمات کلیدی یا فیلترهای خود را تغییر دهید
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearchTerm("");
                  setFilters({
                    employmentType: "",
                    gender: "",
                    transferType: "",
                    currentWorkPlace: "",
                    sourceDistrict: "",
                    currentTransferStatus: "",
                    requestStatus: "",
                    medicalCommissionCode: "",
                    scoreMin: "",
                    scoreMax: "",
                    yearsMin: "",
                    yearsMax: "",
                    isActive: "",
                    createdDateFrom: "",
                    createdDateTo: "",
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors mx-auto"
              >
                <FaTimes className="h-4 w-4" />
                پاک کردن همه فیلترها
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              {searchLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <div className="flex items-center gap-3 bg-white rounded-lg shadow-lg px-6 py-3">
                    <FaSpinner className="animate-spin h-5 w-5 text-blue-600" />
                    <span className="text-gray-700 font-medium">
                      در حال بروزرسانی...
                    </span>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-right">
                    {visibleColumns.map((columnKey) => {
                      const column = availableColumns.find(
                        (col) => col.key === columnKey
                      );
                      return (
                        <th
                          key={columnKey}
                          className=" py-3 px-4 font-semibold text-gray-700 forced-color-text-black text-right"
                        >
                          {column?.label}
                        </th>
                      );
                    })}
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 forced-color-text-black">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr
                      key={spec._id}
                      className="border-b border-gray-100 hover:bg-gray-50 text-right"
                    >
                      {visibleColumns.map((columnKey) => (
                        <td
                          key={columnKey}
                          className="py-3 px-4 text-gray-800 forced-color-text-black"
                        >
                          {renderColumnValue(spec, columnKey)}
                        </td>
                      ))}

                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center space-x-2 space-x-reverse text-right gap-2">
                          <button
                            onClick={() => handleViewTimeline(spec)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="تاریخچه فرآیند"
                          >
                            <FaHistory className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(spec)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="ویرایش"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          {/* دکمه حذف فقط برای مدیر سیستم و کارشناس استان */}
                          {(user?.role === "systemAdmin" ||
                            user?.role === "provinceTransferExpert") && (
                            <button
                              onClick={() => handleDelete(spec._id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="حذف"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                {(() => {
                  const createPaginationItems = () => {
                    const items = [];
                    const maxVisible = 10;
                    const halfVisible = Math.floor(maxVisible / 2);

                    let startPage = Math.max(1, currentPage - halfVisible);
                    let endPage = Math.min(
                      totalPages,
                      startPage + maxVisible - 1
                    );

                    // تنظیم startPage اگر endPage کمتر از maxVisible باشد
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }

                    // دکمه Previous
                    if (currentPage > 1) {
                      items.push(
                        <button
                          key="prev"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-r-md"
                        >
                          قبلی
                        </button>
                      );
                    }

                    // صفحه اول + نقطه
                    if (startPage > 1) {
                      items.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );

                      if (startPage > 2) {
                        items.push(
                          <span
                            key="dots1"
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                    }

                    // صفحات اصلی
                    for (let page = startPage; page <= endPage; page++) {
                      items.push(
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
                      );
                    }

                    // نقطه + صفحه آخر
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        items.push(
                          <span
                            key="dots2"
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }

                      items.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    // دکمه Next
                    if (currentPage < totalPages) {
                      items.push(
                        <button
                          key="next"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-l-md"
                        >
                          بعدی
                        </button>
                      );
                    }

                    return items;
                  };

                  return createPaginationItems();
                })()}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FaIdCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {editingSpec
                        ? user?.role === "districtTransferExpert"
                          ? "ویرایش محدود پرسنل منطقه"
                          : "ویرایش مشخصات پرسنل"
                        : user?.role === "districtTransferExpert"
                        ? "افزودن پرسنل به منطقه"
                        : "افزودن پرسنل جدید"}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {editingSpec
                        ? user?.role === "districtTransferExpert"
                          ? "ویرایش اطلاعات فردی و شغلی پرسنل منطقه"
                          : "بروزرسانی اطلاعات پرسنل"
                        : user?.role === "districtTransferExpert"
                        ? "ثبت پرسنل جدید برای منطقه شما"
                        : "ثبت اطلاعات پرسنل جدید در سیستم"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
              <div className="p-6">
                {/* متغیر برای بررسی محدودیت ویرایش */}
                {(() => {
                  const isDistrictExpert =
                    user?.role === "districtTransferExpert";

                  return (
                    <form
                      onSubmit={
                        !isDistrictExpert
                          ? handleSubmit
                          : (e) => {
                              e.preventDefault();
                              handleSubmitDistrictEdit();
                            }
                      }
                      className="space-y-6"
                    >
                      {/* مشخصات فردی */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <FaUser className="h-5 w-5 text-blue-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            مشخصات فردی
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              نام <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={editingSpec}
                              value={formData.firstName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  firstName: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              نام خانوادگی{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={editingSpec}
                              value={formData.lastName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  lastName: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد پرسنلی (8 رقم){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={editingSpec}
                              value={formData.personnelCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  personnelCode: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              maxLength="8"
                              pattern="[0-9]{8}"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد ملی (8-10 رقم){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={editingSpec}
                              value={formData.nationalId}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  nationalId: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              maxLength="10"
                              pattern="[0-9]{8,10}"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              جنسیت <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.gender}
                              disabled={editingSpec}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  gender: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            >
                              {helpers.genders?.map((gender) => (
                                <option key={gender.value} value={gender.value}>
                                  {gender.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              تلفن همراه (11 رقم){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.mobile}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  mobile: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              maxLength="11"
                              pattern="[0-9]{11}"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* مشخصات شغلی */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <FaIdCard className="h-5 w-5 text-green-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            مشخصات شغلی
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              نوع استخدام{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.employmentType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  employmentType: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            >
                              {helpers.employmentTypes?.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              سنوات مؤثر <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={formData.effectiveYears}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  effectiveYears: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              min="0"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              انتخاب رشته استخدامی{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.selectedEmploymentField}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                if (selectedValue) {
                                  const selectedField =
                                    helpers.employmentFields.find(
                                      (field) =>
                                        `${field.fieldCode}-${field.title}` ===
                                        selectedValue
                                    );
                                  if (selectedField) {
                                    setFormData({
                                      ...formData,
                                      selectedEmploymentField: selectedValue,
                                      employmentField: selectedField.title,
                                      fieldCode: selectedField.fieldCode,
                                    });
                                  }
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedEmploymentField: "",
                                    employmentField: "",
                                    fieldCode: "",
                                  });
                                }
                              }}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            >
                              <option value="">انتخاب کنید</option>
                              {helpers.employmentFields?.map((field) => (
                                <option
                                  key={`${field.fieldCode}-${field.title}`}
                                  value={`${field.fieldCode}-${field.title}`}
                                >
                                  {field.displayName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              رشته استخدامی{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.employmentField}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  employmentField: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white bg-gray-50"
                              required
                              readOnly
                              placeholder="از لیست بالا انتخاب کنید"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد رشته <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.fieldCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  fieldCode: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white bg-gray-50"
                              required
                              readOnly
                              placeholder="از لیست بالا انتخاب کنید"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              امتیاز تایید شده{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={formData.approvedScore}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  approvedScore:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              نوع انتقال تقاضا{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.requestedTransferType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  requestedTransferType: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              required
                            >
                              {helpers.transferTypes?.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* اطلاعات مکانی */}
                      <div
                        className={`bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 ${
                          isDistrictExpert ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <FaMapMarkerAlt className="h-5 w-5 text-purple-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            اطلاعات مکانی
                            {isDistrictExpert && (
                              <span className="text-xs text-orange-600 mr-2 font-medium">
                                (محدود به منطقه شما)
                              </span>
                            )}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد محل خدمت{" "}
                              <span className="text-red-500">*</span>
                              {isDistrictExpert && (
                                <span className="text-xs text-blue-600 mr-2">
                                  (کد منطقه شما: {user?.district?.code})
                                </span>
                              )}
                            </label>
                            <select
                              value={formData.currentWorkPlaceCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  currentWorkPlaceCode: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={isDistrictExpert}
                              required
                            >
                              <option value="">انتخاب کنید</option>
                              {helpers.districts?.map((district) => (
                                <option
                                  key={district.code}
                                  value={district.code}
                                >
                                  {`${district.name} (${district.code})`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد مبدا <span className="text-red-500">*</span>
                              {isDistrictExpert && (
                                <span className="text-xs text-blue-600 mr-2">
                                  (کد منطقه شما: {user?.district?.code})
                                </span>
                              )}
                            </label>
                            <select
                              value={formData.sourceDistrictCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  sourceDistrictCode: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={isDistrictExpert}
                              required
                            >
                              <option value="">انتخاب کنید</option>
                              {helpers.districts?.map((district) => (
                                <option
                                  key={district.code}
                                  value={district.code}
                                >
                                  {`${district.name} (${district.code})`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* اولویت‌های مقصد */}
                      <div
                        className={`bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-100 ${
                          isDistrictExpert ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <FaMapMarkerAlt className="h-5 w-5 text-orange-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            اولویت‌های مقصد
                            {isDistrictExpert && (
                              <span className="text-xs text-red-600 mr-2 font-medium">
                                (غیرقابل ویرایش)
                              </span>
                            )}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {[1, 2].map((priority) => {
                            const isEnabled = isPriorityEnabled(priority);
                            const availableDistricts =
                              getAvailableDistricts(priority);

                            return (
                              <div
                                key={priority}
                                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                                  !isEnabled ? "opacity-50" : ""
                                }`}
                              >
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    مقصد اولویت {priority} - منطقه
                                    {!isEnabled && (
                                      <span className="text-xs text-gray-500 mr-2 forced-color-text-gray">
                                        (ابتدا اولویت {priority - 1} را پر کنید)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={
                                      formData[`destinationPriority${priority}`]
                                        ?.districtCode || ""
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        [`destinationPriority${priority}`]: {
                                          ...formData[
                                            `destinationPriority${priority}`
                                          ],
                                          districtCode: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={!isEnabled || isDistrictExpert}
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <option value="">انتخاب کنید</option>
                                    {availableDistricts.map((district) => (
                                      <option
                                        key={district.code}
                                        value={district.code}
                                      >
                                        {`${district.name} (${district.code})`}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    نوع انتقال اولویت {priority}
                                  </label>
                                  <select
                                    value={
                                      formData[`destinationPriority${priority}`]
                                        ?.transferType || "permanent_preferred"
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        [`destinationPriority${priority}`]: {
                                          ...formData[
                                            `destinationPriority${priority}`
                                          ],
                                          transferType: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={
                                      !isEnabled ||
                                      !formData[
                                        `destinationPriority${priority}`
                                      ]?.districtCode
                                    }
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled ||
                                      !formData[
                                        `destinationPriority${priority}`
                                      ]?.districtCode
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {helpers.destinationTransferTypes?.map(
                                      (type) => (
                                        <option
                                          key={type.value}
                                          value={type.value}
                                        >
                                          {type.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>
                            );
                          })}

                          {/* اولویت 3 مثل بقیه اولویت‌ها */}
                          {(() => {
                            const priority = 3;
                            const isEnabled = isPriorityEnabled(priority);
                            const availableDistricts =
                              getAvailableDistricts(priority);

                            return (
                              <div
                                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                                  !isEnabled ? "opacity-50" : ""
                                }`}
                              >
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    مقصد اولویت 3 - منطقه
                                    {!isEnabled && (
                                      <span className="text-xs text-gray-500 mr-2 forced-color-text-gray">
                                        (ابتدا اولویت 2 را پر کنید)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={
                                      formData.destinationPriority3
                                        ?.districtCode || ""
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        destinationPriority3: {
                                          ...formData.destinationPriority3,
                                          districtCode: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={!isEnabled || isDistrictExpert}
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <option value="">انتخاب کنید</option>
                                    {availableDistricts.map((district) => (
                                      <option
                                        key={district.code}
                                        value={district.code}
                                      >
                                        {`${district.name} (${district.code})`}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    نوع انتقال اولویت 3
                                  </label>
                                  <select
                                    value={
                                      formData.destinationPriority3
                                        ?.transferType || "permanent_preferred"
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        destinationPriority3: {
                                          ...formData.destinationPriority3,
                                          transferType: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={
                                      !isEnabled ||
                                      !formData.destinationPriority3
                                        ?.districtCode
                                    }
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled ||
                                      !formData.destinationPriority3
                                        ?.districtCode
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {helpers.destinationTransferTypes?.map(
                                      (type) => (
                                        <option
                                          key={type.value}
                                          value={type.value}
                                        >
                                          {type.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>
                            );
                          })()}

                          {/* اولویت‌های 4 تا 7 */}
                          {[4, 5, 6, 7].map((priority) => {
                            const isEnabled = isPriorityEnabled(priority);
                            const availableDistricts =
                              getAvailableDistricts(priority);

                            return (
                              <div
                                key={priority}
                                className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                                  !isEnabled ? "opacity-50" : ""
                                }`}
                              >
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    مقصد اولویت {priority} - منطقه
                                    {!isEnabled && (
                                      <span className="text-xs text-gray-500 mr-2 forced-color-text-gray">
                                        (ابتدا اولویت {priority - 1} را پر کنید)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={
                                      formData[`destinationPriority${priority}`]
                                        ?.districtCode || ""
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        [`destinationPriority${priority}`]: {
                                          ...formData[
                                            `destinationPriority${priority}`
                                          ],
                                          districtCode: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={!isEnabled || isDistrictExpert}
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <option value="">انتخاب کنید</option>
                                    {availableDistricts.map((district) => (
                                      <option
                                        key={district.code}
                                        value={district.code}
                                      >
                                        {`${district.name} (${district.code})`}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                                    نوع انتقال اولویت {priority}
                                  </label>
                                  <select
                                    value={
                                      formData[`destinationPriority${priority}`]
                                        ?.transferType || "permanent_preferred"
                                    }
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        [`destinationPriority${priority}`]: {
                                          ...formData[
                                            `destinationPriority${priority}`
                                          ],
                                          transferType: e.target.value,
                                        },
                                      })
                                    }
                                    disabled={
                                      !isEnabled ||
                                      !formData[
                                        `destinationPriority${priority}`
                                      ]?.districtCode
                                    }
                                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white ${
                                      !isEnabled ||
                                      !formData[
                                        `destinationPriority${priority}`
                                      ]?.districtCode
                                        ? "bg-gray-100 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {helpers.destinationTransferTypes?.map(
                                      (type) => (
                                        <option
                                          key={type.value}
                                          value={type.value}
                                        >
                                          {type.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* وضعیت‌ها */}
                      <div
                        className={`bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 ${
                          isDistrictExpert ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-indigo-100 p-2 rounded-lg">
                            <FaCheck className="h-5 w-5 text-indigo-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            وضعیت‌ها
                            {isDistrictExpert && (
                              <span className="text-xs text-red-600 mr-2 font-medium">
                                (غیرقابل ویرایش)
                              </span>
                            )}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              وضعیت فعلی انتقال
                            </label>
                            <select
                              value={formData.currentTransferStatus}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  currentTransferStatus: parseInt(
                                    e.target.value
                                  ),
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={isDistrictExpert}
                            >
                              {helpers.currentTransferStatuses?.map(
                                (status) => (
                                  <option
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              وضعیت درخواست
                            </label>
                            <select
                              value={formData.requestStatus}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  requestStatus: e.target.value,
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                            >
                              {helpers.requestStatuses?.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              کد رای کمیسیون پزشکی
                            </label>
                            <select
                              value={formData.medicalCommissionCode}
                              onChange={(e) => {
                                const selectedCode =
                                  parseInt(e.target.value) || "";
                                // پیدا کردن متن مربوط به کد انتخاب شده
                                const selectedCommission =
                                  helpers.medicalCommissionCodes?.find(
                                    (code) => code.value === selectedCode
                                  );

                                setFormData({
                                  ...formData,
                                  medicalCommissionCode: selectedCode,
                                  medicalCommissionVerdict:
                                    selectedCommission?.label || "",
                                });
                              }}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={isDistrictExpert}
                            >
                              <option value="">انتخاب کنید</option>
                              {helpers.medicalCommissionCodes?.map((code) => (
                                <option key={code.value} value={code.value}>
                                  {code.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              رای کمیسیون پزشکی (متن)
                            </label>
                            <textarea
                              value={formData.medicalCommissionVerdict}
                              readOnly
                              rows={2}
                              className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed forced-color-text-black forced-color-bg-gray"
                              placeholder="متن خودکار بر اساس کد انتخاب شده پر خواهد شد"
                            />
                          </div>
                        </div>
                      </div>

                      {/* مقصد نهایی */}
                      <div
                        className={`bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100 ${
                          isDistrictExpert ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-teal-100 p-2 rounded-lg">
                            <FaMapMarkerAlt className="h-5 w-5 text-teal-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 forced-color-text-black">
                            مقصد نهایی
                            {isDistrictExpert && (
                              <span className="text-xs text-red-600 mr-2 font-medium">
                                (غیرقابل ویرایش)
                              </span>
                            )}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              منطقه مقصد نهایی
                            </label>
                            <select
                              value={
                                formData.finalDestination?.districtCode || ""
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  finalDestination: {
                                    ...formData.finalDestination,
                                    districtCode: e.target.value,
                                  },
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={isDistrictExpert || true}
                            >
                              <option value="">انتخاب کنید</option>
                              {getAvailableDistricts(99)?.map((district) => (
                                <option
                                  key={district.code}
                                  value={district.code}
                                >
                                  {`${district.name} (${district.code})`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 forced-color-text-black">
                              نوع انتقال نهایی
                            </label>
                            <select
                              value={
                                formData.finalDestination?.transferType ||
                                "permanent"
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  finalDestination: {
                                    ...formData.finalDestination,
                                    transferType: e.target.value,
                                  },
                                })
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 forced-color-text-black forced-color-bg-white"
                              disabled={
                                !formData.finalDestination?.districtCode ||
                                isDistrictExpert ||
                                true
                              }
                            >
                              {helpers.finalDestinationTransferTypes?.map(
                                (type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="flex items-center">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.canEditDestination}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    canEditDestination: e.target.checked,
                                  })
                                }
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                disabled={isDistrictExpert}
                              />
                              <span className="mr-2 text-sm text-gray-700">
                                امکان ویرایش مقصد
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* وضعیت فعال بودن */}
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
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <span className="mr-2 text-sm text-gray-700">
                            فعال
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="px-6 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          <FaTimes className="h-4 w-4" />
                          انصراف
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          disabled={helpersLoading}
                        >
                          {helpersLoading ? (
                            <FaSpinner className="animate-spin h-4 w-4" />
                          ) : editingSpec ? (
                            <>
                              <FaEdit className="h-4 w-4" />
                              {isDistrictExpert
                                ? "ذخیره تغییرات محدود"
                                : "ویرایش"}
                            </>
                          ) : (
                            <>
                              <FaPlus className="h-4 w-4" />
                              ایجاد
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 rounded-t-xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FaFileImport className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">بارگذاری فایل اکسل</h3>
                    <p className="text-green-100 text-sm">
                      آپلود اطلاعات پرسنل از فایل اکسل
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadResults(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className="bg-green-100 p-4 rounded-full">
                    <FaCloudUploadAlt className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      {uploadFile ? uploadFile.name : "انتخاب فایل اکسل"}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      فایل‌های .xlsx و .xls پشتیبانی می‌شوند
                    </p>
                  </div>
                </label>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
                    <FaFileExcel className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      راهنما:
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• ابتدا فایل نمونه را دانلود کنید</li>
                      <li>
                        • ستون‌های ضروری: نام، نام خانوادگی، کد پرسنلی، نوع
                        استخدام، جنسیت، تلفن همراه
                      </li>
                      <li>• کد پرسنلی باید 8 رقم و یکتا باشد</li>
                      <li>• شماره همراه باید 11 رقم باشد</li>
                      <li>• فرمت‌های مجاز: .xlsx، .xls</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Results */}
              {uploadResults && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      نتایج بارگذاری:
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700">
                          {uploadResults.total}
                        </div>
                        <div className="text-sm text-gray-600">کل ردیف‌ها</div>
                      </div>
                      <div className="bg-green-100 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {uploadResults.success}
                        </div>
                        <div className="text-sm text-green-600">موفق</div>
                      </div>
                      <div className="bg-red-100 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-700">
                          {uploadResults.errors.length}
                        </div>
                        <div className="text-sm text-red-600">ناموفق</div>
                      </div>
                    </div>
                  </div>

                  {uploadResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <h5 className="font-semibold text-red-800 mb-2">
                        خطاها:
                      </h5>
                      <div className="space-y-2">
                        {uploadResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="text-sm bg-white p-2 rounded border-l-4 border-red-400"
                          >
                            <span className="font-medium">
                              سطر {error.row}:
                            </span>{" "}
                            {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadResults(null);
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={downloadTemplate}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FaDownload className="h-4 w-4" />
                  دانلود نمونه
                </button>
                <button
                  onClick={handleUploadFile}
                  disabled={!uploadFile || uploading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <FaSpinner className="animate-spin h-4 w-4" />
                  ) : (
                    <FaUpload className="h-4 w-4" />
                  )}
                  {uploading ? "در حال بارگذاری..." : "بارگذاری"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      <StatusTimelineModal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setSelectedSpecForTimeline(null);
        }}
        specId={selectedSpecForTimeline?.id}
        specInfo={selectedSpecForTimeline}
      />
    </div>
  );
}
