"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUserContext } from "@/context/UserContext";
import {
  FaWifi,
  FaDesktop,
  FaLaptop,
  FaTablet,
  FaTv,
  FaVideo,
  FaPrint,
  FaShieldAlt,
  FaGraduationCap,
  FaBook,
  FaSave,
  FaEdit,
  FaTachometerAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";

export default function SmartSchoolPage() {
  const { user } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingData, setExistingData] = useState(null);

  const [formData, setFormData] = useState({
    // زیرساخت فنی
    internetConnection: "",
    internetSpeed: 0,
    internetSpeedUnit: "Mbps",
    personalInternetUsage: false,
    wifiAvailable: false,
    wifiCoverage: "",

    // تجهیزات سخت‌افزاری
    computerCount: 0,
    laptopCount: 0,
    tabletCount: 0,
    smartBoardCount: 0,
    projectorCount: 0,
    printerCount: 0,
    scannerCount: 0,
    hasComputerWorkshop: false,
    computerWorkshopSystemsCount: 0,

    // نرم‌افزارها و سیستم‌ها
    managementSoftware: "",
    managementSoftwareUrl: "",
    managementSoftwareSatisfaction: "",
    antivirusSoftware: false,
    antivirusSoftwareName: "",

    // آموزش و مهارت
    teacherITSkillLevel: "",
    studentITSkillLevel: "",
    itTrainingProgram: false,

    // پرسنل فنی
    technicalStaffCode: "",
    technicalStaffFirstName: "",
    technicalStaffLastName: "",
    technicalStaffPhone: "",
    technicalStaffSkills: "", // مهارت‌های پرسنل فنی

    // خدمات آنلاین
    onlineClassesCapability: false,
    onlineClassesUrl: "", // آدرس سایت کلاس آنلاین
    elearningPlatform: false,
    elearningPlatformUrl: "", // آدرس پلتفرم آموزش الکترونیکی
    digitalLibrary: false,
    digitalLibraryUrl: "", // آدرس کتابخانه دیجیتال
    onlineExamSystem: false,
    onlineExamSystemUrl: "", // آدرس سیستم آزمون آنلاین

    // اطلاعات کلاس‌ها
    totalClassrooms: 0, // تعداد کل کلاس‌های مدرسه
    smartClassrooms: 0, // تعداد کلاس‌های هوشمند

    // نظرات
    comments: "",
  });

  // دریافت اطلاعات موجود
  useEffect(() => {
    fetchExistingData();
    fetchDefaultClasses();
  }, []);

  const fetchExistingData = async () => {
    try {
      const response = await fetch("/api/smart-school");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          const data = result.data[0];
          setExistingData(data);
          setFormData(data);
          setIsEditing(true);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchDefaultClasses = async () => {
    try {
      const response = await fetch("/api/smart-school/default-classes");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.defaultTotalClasses > 0) {
          setFormData((prev) => ({
            ...prev,
            totalClassrooms:
              prev.totalClassrooms || result.data.defaultTotalClasses,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching default classes:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newValue = type === "checkbox" ? checked : value;

    // اعتبارسنجی برای کلاس‌های هوشمند
    if (name === "smartClassrooms") {
      const totalClassrooms = parseInt(formData.totalClassrooms) || 0;
      const smartClassrooms = parseInt(value) || 0;

      // فقط اگر تعداد کل کلاس‌ها بیشتر از صفر باشد، اعتبارسنجی انجام شود
      if (totalClassrooms > 0 && smartClassrooms > totalClassrooms) {
        // نمایش پیام خطا
        toast.error(
          `❌ خطا: ${smartClassrooms} بیشتر از ${totalClassrooms} است!`,
          {
            duration: 3000,
            position: "top-right",
          }
        );
        return; // جلوگیری از تغییر مقدار
      }
    }

    // فیلد totalClassrooms قابل تغییر نیست، پس validation آن را حذف می‌کنیم
    if (name === "totalClassrooms") {
      // مقدار ثابت است و نباید تغییر کند
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleArrayChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked
        ? [...prev[name], value]
        : prev[name].filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log(
        "Form data before submit:",
        JSON.stringify(formData, null, 2)
      );
      console.log(
        "totalClassrooms:",
        formData.totalClassrooms,
        typeof formData.totalClassrooms
      );
      console.log(
        "smartClassrooms:",
        formData.smartClassrooms,
        typeof formData.smartClassrooms
      );

      // اعتبارسنجی نهایی قبل از ارسال
      const totalClassrooms = parseInt(formData.totalClassrooms) || 0;
      const smartClassrooms = parseInt(formData.smartClassrooms) || 0;

      if (totalClassrooms > 0 && smartClassrooms > totalClassrooms) {
        toast.error(`🚫 خطا: ${smartClassrooms} بیشتر از ${totalClassrooms}!`, {
          duration: 3000,
          position: "top-right",
        });
        setIsLoading(false);
        return;
      }

      // تبدیل مقادیر عددی به نوع صحیح
      const processedFormData = {
        ...formData,
        // فیلدهای عددی
        internetSpeed: parseInt(formData.internetSpeed) || 0,
        computerCount: parseInt(formData.computerCount) || 0,
        laptopCount: parseInt(formData.laptopCount) || 0,
        tabletCount: parseInt(formData.tabletCount) || 0,
        smartBoardCount: parseInt(formData.smartBoardCount) || 0,
        projectorCount: parseInt(formData.projectorCount) || 0,
        printerCount: parseInt(formData.printerCount) || 0,
        scannerCount: parseInt(formData.scannerCount) || 0,
        computerWorkshopSystemsCount:
          parseInt(formData.computerWorkshopSystemsCount) || 0,
        totalClassrooms: parseInt(formData.totalClassrooms) || 0,
        smartClassrooms: parseInt(formData.smartClassrooms) || 0,
      };

      console.log(
        "Processed form data:",
        JSON.stringify(processedFormData, null, 2)
      );

      const url = "/api/smart-school";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedFormData),
      });

      const result = await response.json();
      console.log("API Response:", result);

      if (result.success) {
        console.log("Showing success toast:", result.message);
        toast.success(result.message, {
          duration: 5000,
          position: "top-right",
        });

        if (!isEditing) {
          setIsEditing(true);
          setExistingData(result.data);
        } else {
          // بروزرسانی داده‌های موجود
          setExistingData(result.data);
        }

        // نمایش اولویت‌های بهبود در صورت وجود
        if (
          result.data.improvementPriorities &&
          result.data.improvementPriorities.length > 0
        ) {
          console.log("Showing improvement priorities toast");
          setTimeout(() => {
            toast(
              `💡 اولویت‌های بهبود: ${result.data.improvementPriorities
                .slice(0, 2)
                .join("، ")}${
                result.data.improvementPriorities.length > 2 ? " و..." : ""
              }`,
              {
                icon: "💡",
                duration: 8000,
                position: "top-right",
                style: {
                  background: "#3B82F6",
                  color: "#fff",
                },
              }
            );
          }, 2000);
        }
      } else {
        console.log("Showing error toast:", result.error);
        toast.error(result.error, {
          duration: 5000,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast.error("خطا در ارسال اطلاعات", {
        duration: 5000,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSmartSchoolLevel = (score) => {
    if (score >= 80)
      return { level: "پیشرفته", color: "text-green-600", bg: "bg-green-100" };
    if (score >= 60)
      return { level: "متوسط", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (score >= 40)
      return {
        level: "مقدماتی",
        color: "text-orange-600",
        bg: "bg-orange-100",
      };
    return { level: "ابتدایی", color: "text-red-600", bg: "bg-red-100" };
  };

  const smartSchoolLevel = existingData
    ? getSmartSchoolLevel(existingData.smartSchoolScore)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaTachometerAlt className="text-blue-600" />
            مدرسه هوشمند
          </h1>
          {existingData && (
            <div className={`px-4 py-2 rounded-lg ${smartSchoolLevel.bg}`}>
              <span className={`font-medium ${smartSchoolLevel.color}`}>
                امتیاز: {existingData.smartSchoolScore}/100 -{" "}
                {smartSchoolLevel.level}
              </span>
            </div>
          )}
        </div>

        {existingData && existingData.improvementPriorities.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <div className="flex items-center mb-2">
              <FaExclamationTriangle className="text-orange-400 ml-2" />
              <h3 className="text-lg font-medium text-orange-800">
                اولویت‌های بهبود در صورت امکان
              </h3>
            </div>
            <ul className="list-disc list-inside text-orange-700">
              {existingData.improvementPriorities.map((priority, index) => (
                <li key={index} className="text-gray-700">
                  {priority}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* زیرساخت فنی */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <FaWifi className="text-blue-600" />
              زیرساخت فنی و شبکه
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نوع اتصال اینترنت *
                </label>
                <select
                  name="internetConnection"
                  value={formData.internetConnection}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-700"
                  required
                >
                  <option value="">انتخاب کنید</option>
                  <option value="ندارد">ندارد</option>
                  <option value="ADSL">ADSL</option>
                  <option value="فیبر نوری">فیبر نوری</option>
                  <option value="4G/5G">4G/5G</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  سرعت اینترنت
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="internetSpeed"
                    value={formData.internetSpeed}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-700"
                    min="0"
                  />
                  <select
                    name="internetSpeedUnit"
                    value={formData.internetSpeedUnit}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="Kbps">Kbps</option>
                    <option value="Mbps">Mbps</option>
                    <option value="Gbps">Gbps</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="personalInternetUsage"
                    checked={formData.personalInternetUsage}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  استفاده از اینترنت شخصی
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="wifiAvailable"
                    checked={formData.wifiAvailable}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  شبکه وای‌فای موجود است
                </label>
              </div>

              {formData.wifiAvailable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کیفیت پوشش وای‌فای
                  </label>
                  <select
                    name="wifiCoverage"
                    value={formData.wifiCoverage}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="ضعیف">ضعیف</option>
                    <option value="مناسب">مناسب</option>
                    <option value="خوب">خوب</option>
                    <option value="عالی">عالی</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* اطلاعات کلاس‌ها */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <FaGraduationCap className="text-purple-600" />
              اطلاعات کلاس‌ها
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تعداد کل کلاس‌های مدرسه{" "}
                  <span className="text-blue-500">(ثابت)</span>
                </label>
                <input
                  disabled={true}
                  type="number"
                  name="totalClassrooms"
                  value={formData.totalClassrooms}
                  readOnly
                  min="0"
                  required
                  className="w-full border border-gray-200 bg-gray-100 text-gray-700 rounded-md px-3 py-2 cursor-not-allowed "
                  placeholder="مثال: 12"
                />
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <span>🔒</span>
                  این مقدار از سال قبل دریافت شده و قابل تغییر نیست
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تعداد کلاس‌های هوشمند <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="smartClassrooms"
                  value={formData.smartClassrooms}
                  onChange={handleInputChange}
                  min="0"
                  max={formData.totalClassrooms || 999}
                  required
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 text-gray-700 ${
                    formData.totalClassrooms > 0 &&
                    formData.smartClassrooms > formData.totalClassrooms
                      ? "border-red-500 bg-red-50 focus:ring-red-500"
                      : "border-gray-300 focus:ring-purple-500"
                  }`}
                  placeholder="مثال: 6"
                />
                {formData.totalClassrooms > 0 &&
                  formData.smartClassrooms > formData.totalClassrooms && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      حداکثر {formData.totalClassrooms}
                    </p>
                  )}
                <p className="text-xs text-gray-500 mt-1">
                  کلاس‌هایی که دارای تجهیزات هوشمند (تخته هوشمند، پروژکتور، ...)
                  هستند
                </p>
              </div>
            </div>

            {/* نمایش درصد کلاس‌های هوشمند */}
            {formData.totalClassrooms > 0 && (
              <div className="mt-4 p-3 bg-purple-100 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-800">
                    درصد کلاس‌های هوشمند:
                  </span>
                  <span className="text-lg font-bold text-purple-600">
                    {Math.round(
                      (formData.smartClassrooms / formData.totalClassrooms) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (formData.smartClassrooms /
                            formData.totalClassrooms) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* تجهیزات سخت‌افزاری */}
          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center gap-2">
              <FaDesktop className="text-green-600" />
              تجهیزات سخت‌افزاری
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { key: "computerCount", label: "کامپیوتر", icon: FaDesktop },
                { key: "laptopCount", label: "لپ‌تاپ", icon: FaLaptop },
                { key: "tabletCount", label: "تبلت", icon: FaTablet },
                {
                  key: "smartBoardCount",
                  label: "تخته هوشمند",
                  icon: FaTv,
                },
                {
                  key: "projectorCount",
                  label: "ویدئو پروژکتور",
                  icon: FaVideo,
                },
                { key: "printerCount", label: "چاپگر", icon: FaPrint },
                {
                  key: "scannerCount",
                  label: "اسکنر",
                  icon: FaSearch,
                },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="text-center">
                  <Icon className="mx-auto text-2xl text-green-600 mb-2" />
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 text-gray-700"
                    min="0"
                  />
                </div>
              ))}
            </div>

            {/* کارگاه کامپیوتر */}
            <div className="mt-6 pt-4 border-t border-green-200">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="hasComputerWorkshop"
                    checked={formData.hasComputerWorkshop}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  کارگاه کامپیوتر فعال دارد
                </label>

                {formData.hasComputerWorkshop && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      تعداد سیستم‌ها:
                    </label>
                    <input
                      type="number"
                      name="computerWorkshopSystemsCount"
                      value={formData.computerWorkshopSystemsCount}
                      onChange={handleInputChange}
                      className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 text-gray-700"
                      min="0"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* نرم‌افزارها و سیستم‌ها */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-purple-600" />
              نرم‌افزارها و سیستم‌ها
            </h2>
            <div className="space-y-6">
              {/* نرم‌افزار مدیریت */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نرم‌افزار مدیریت
                </label>
                <select
                  name="managementSoftware"
                  value={formData.managementSoftware}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 text-gray-700"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="ندارد">ندارد</option>
                  <option value="سامانه آموزش">سامانه آموزش</option>
                  <option value="سیستم مدیریت مدرسه">سیستم مدیریت مدرسه</option>
                  <option value="LMS">LMS</option>
                  <option value="سایر">سایر</option>
                </select>
              </div>

              {/* جزئیات نرم‌افزار مدیریت */}
              {formData.managementSoftware &&
                formData.managementSoftware !== "ندارد" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-md border border-purple-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        آدرس سامانه (اختیاری)
                      </label>
                      <input
                        type="url"
                        name="managementSoftwareUrl"
                        value={formData.managementSoftwareUrl}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 text-gray-700"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        میزان رضایت (اختیاری)
                      </label>
                      <select
                        name="managementSoftwareSatisfaction"
                        value={formData.managementSoftwareSatisfaction}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 text-gray-700"
                      >
                        <option value="">انتخاب کنید</option>
                        <option value="خیلی کم">خیلی کم</option>
                        <option value="کم">کم</option>
                        <option value="متوسط">متوسط</option>
                        <option value="زیاد">زیاد</option>
                        <option value="خیلی زیاد">خیلی زیاد</option>
                      </select>
                    </div>
                  </div>
                )}

              {/* آنتی‌ویروس */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="antivirusSoftware"
                    checked={formData.antivirusSoftware}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  آنتی‌ویروس
                </label>

                {formData.antivirusSoftware && (
                  <div className="mr-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام آنتی‌ویروس
                    </label>
                    <input
                      type="text"
                      name="antivirusSoftwareName"
                      value={formData.antivirusSoftwareName}
                      onChange={handleInputChange}
                      className="w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 text-gray-700"
                      placeholder="مثال: Kaspersky, Norton, ..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* آموزش و مهارت */}
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              <FaGraduationCap className="text-yellow-600" />
              آموزش و مهارت
            </h2>
            <div className="space-y-6">
              {/* سطح مهارت */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سطح مهارت فناوری اطلاعات معلمان
                  </label>
                  <select
                    name="teacherITSkillLevel"
                    value={formData.teacherITSkillLevel}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="مبتدی">مبتدی</option>
                    <option value="متوسط">متوسط</option>
                    <option value="پیشرفته">پیشرفته</option>
                    <option value="خبره">خبره</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سطح مهارت فناوری اطلاعات دانش‌آموزان
                  </label>
                  <select
                    name="studentITSkillLevel"
                    value={formData.studentITSkillLevel}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="مبتدی">مبتدی</option>
                    <option value="متوسط">متوسط</option>
                    <option value="پیشرفته">پیشرفته</option>
                    <option value="خبره">خبره</option>
                  </select>
                </div>
              </div>

              {/* اطلاعات پرسنل فنی */}
              <div className="border-t border-yellow-200 pt-4">
                <h3 className="text-lg font-medium text-yellow-800 mb-4">
                  اطلاعات پرسنل فنی مدرسه (رابط هوشمند سازی)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد پرسنلی
                    </label>
                    <input
                      type="text"
                      name="technicalStaffCode"
                      value={formData.technicalStaffCode}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                      placeholder="مثال: 12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام
                    </label>
                    <input
                      type="text"
                      name="technicalStaffFirstName"
                      value={formData.technicalStaffFirstName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                      placeholder="نام"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام خانوادگی
                    </label>
                    <input
                      type="text"
                      name="technicalStaffLastName"
                      value={formData.technicalStaffLastName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                      placeholder="نام خانوادگی"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      شماره همراه
                    </label>
                    <input
                      type="tel"
                      name="technicalStaffPhone"
                      value={formData.technicalStaffPhone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      مهارت‌های فنی (اختیاری)
                    </label>
                    <textarea
                      name="technicalStaffSkills"
                      value={formData.technicalStaffSkills}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 text-gray-700"
                      placeholder="مثال: تعمیر سخت‌افزار، نصب نرم‌افزار، شبکه، امنیت سایبری، برنامه‌نویسی، ..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      لطفاً مهارت‌های فنی و تخصصی پرسنل مسئول هوشمندسازی را به
                      صورت مختصر بنویسید
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* خدمات آنلاین */}
          <div className="bg-indigo-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-indigo-800 mb-4 flex items-center gap-2">
              <FaVideo className="text-indigo-600" />
              خدمات آنلاین
            </h2>
            <div className="space-y-6">
              {/* کلاس آنلاین */}
              <div>
                <label className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="onlineClassesCapability"
                    checked={formData.onlineClassesCapability}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 "
                  />
                  کلاس آنلاین
                </label>
                {formData.onlineClassesCapability && (
                  <div className="mr-6">
                    <input
                      type="url"
                      name="onlineClassesUrl"
                      value={formData.onlineClassesUrl}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-700"
                      placeholder="آدرس سایت یا سرویس کلاس آنلاین (مثال: https://meet.google.com)"
                    />
                  </div>
                )}
              </div>

              {/* پلتفرم آموزش الکترونیکی */}
              <div>
                <label className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="elearningPlatform"
                    checked={formData.elearningPlatform}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  پلتفرم آموزش الکترونیکی
                </label>
                {formData.elearningPlatform && (
                  <div className="mr-6">
                    <input
                      type="url"
                      name="elearningPlatformUrl"
                      value={formData.elearningPlatformUrl}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="آدرس پلتفرم آموزش الکترونیکی (مثال: https://lms.school.ir)"
                    />
                  </div>
                )}
              </div>

              {/* کتابخانه دیجیتال */}
              <div>
                <label className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="digitalLibrary"
                    checked={formData.digitalLibrary}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 "
                  />
                  کتابخانه دیجیتال
                </label>
                {formData.digitalLibrary && (
                  <div className="mr-6">
                    <input
                      type="url"
                      name="digitalLibraryUrl"
                      value={formData.digitalLibraryUrl}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="آدرس کتابخانه دیجیتال (مثال: https://library.school.ir)"
                    />
                  </div>
                )}
              </div>

              {/* سیستم آزمون آنلاین */}
              <div>
                <label className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="onlineExamSystem"
                    checked={formData.onlineExamSystem}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  سیستم آزمون آنلاین
                </label>
                {formData.onlineExamSystem && (
                  <div className="mr-6">
                    <input
                      type="url"
                      name="onlineExamSystemUrl"
                      value={formData.onlineExamSystemUrl}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="آدرس سیستم آزمون آنلاین (مثال: https://exam.school.ir)"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* نظرات */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              نظرات و توضیحات
            </h2>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows="4"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 text-gray-700"
              placeholder="نظرات، توضیحات اضافی، مشکلات و پیشنهادات خود را بنویسید..."
            />
          </div>

          {/* دکمه ثبت */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-lg font-medium"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : isEditing ? (
                <FaEdit />
              ) : (
                <FaSave />
              )}
              {isLoading
                ? "در حال ثبت..."
                : isEditing
                ? "بروزرسانی اطلاعات"
                : "ثبت اطلاعات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
