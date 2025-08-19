"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import {
  FaChartBar,
  FaDownload,
  FaEye,
  FaTachometerAlt,
  FaWifi,
  FaDesktop,
  FaGraduationCap,
  FaExclamationTriangle,
  FaBrain,
  FaSpinner,
  FaTv,
  FaInfoCircle,
  FaQuestionCircle,
  FaMapMarkedAlt,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// راهنمای سطح امتیازات
const ScoreLegend = () => {
  const [isOpen, setIsOpen] = useState(false);

  const levels = [
    {
      name: "ابتدایی",
      range: "زیر 40",
      color: "bg-red-500",
      description: "نیاز به توسعه اساسی",
    },
    {
      name: "مقدماتی",
      range: "40-59",
      color: "bg-orange-500",
      description: "در مسیر پیشرفت",
    },
    {
      name: "متوسط",
      range: "60-79",
      color: "bg-yellow-500",
      description: "سطح قابل قبول",
    },
    {
      name: "پیشرفته",
      range: "80+",
      color: "bg-green-500",
      description: "سطح مطلوب",
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
      >
        <FaQuestionCircle />
        <span className="text-sm font-medium">راهنمای سطح‌ها</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-80 z-10">
          <div className="flex items-center gap-2 mb-3">
            <FaInfoCircle className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">
              راهنمای سطح‌بندی مدارس هوشمند
            </h3>
          </div>

          <div className="space-y-3">
            {levels.map((level, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${level.color}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {level.name}
                    </span>
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {level.range}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {level.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1">
                💡{" "}
                <span>
                  امتیاز شامل: زیرساخت فنی، تجهیزات، آموزش، کلاس‌های هوشمند و
                  خدمات آنلاین
                </span>
              </p>
              <p className="flex items-center gap-1">
                🏫{" "}
                <span>
                  کلاس‌های هوشمند: بر اساس درصد کلاس‌هایی با تجهیزات هوشمند
                  (تخته، پروژکتور، ...)
                </span>
              </p>
              <p className="flex items-center gap-1">
                📊 <span>100% کلاس هوشمند = 10 امتیاز کامل</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function SmartSchoolReportsPage() {
  const { user } = useUserContext();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [error, setError] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // خواندن پارامترهای URL
    const urlParams = new URLSearchParams(window.location.search);
    const districtParam = urlParams.get("district");
    const tabParam = urlParams.get("tab");

    if (districtParam) {
      setSelectedDistrict(districtParam);
    }

    if (tabParam) {
      setActiveTab(tabParam);

      // برای کارشناس فناوری منطقه، تب districts باید به عنوان detailed لود شود
      let reportType = tabParam;
      if (
        (user?.role === "districtTechExpert" ||
          user?.role === "DISTRICT_TECH_EXPERT") &&
        tabParam === "districts"
      ) {
        reportType = "detailed";
      }

      fetchReportData(reportType);
    } else {
      fetchReportData("summary");
    }
  }, [user?.role]); // اضافه کردن user.role به dependencies

  const fetchReportData = async (reportType) => {
    setLoading(true);
    setError("");
    try {
      // ساخت URL با پارامترهای اضافی
      const urlParams = new URLSearchParams(window.location.search);
      const districtParam = urlParams.get("district");

      let apiUrl = `/api/smart-school/reports?type=${reportType}`;
      if (districtParam) {
        apiUrl += `&district=${districtParam}`;
      }

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
        if (result.selectedDistrictName) {
          setSelectedDistrictName(result.selectedDistrictName);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("خطا در دریافت گزارش");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // برای کارشناس فناوری منطقه، تب districts باید به عنوان detailed لود شود
    let reportType = tab;
    if (
      (user?.role === "districtTechExpert" ||
        user?.role === "DISTRICT_TECH_EXPERT") &&
      tab === "districts"
    ) {
      reportType = "detailed";
    }

    fetchReportData(reportType);
  };

  const downloadReport = async () => {
    if (!reportData) return;

    try {
      // ساخت URL با پارامترهای اضافی
      const urlParams = new URLSearchParams(window.location.search);
      const districtParam = urlParams.get("district");

      let exportUrl = `/api/smart-school/reports/export?type=${activeTab}`;
      if (districtParam) {
        exportUrl += `&district=${districtParam}`;
      }

      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("خطا در دانلود گزارش");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smart-school-report-${activeTab}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      // Fallback to JSON download
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smart-school-report-${activeTab}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderSummaryReport = () => {
    if (!reportData) return null;

    const {
      overview,
      infrastructure,
      equipment,
      software,
      skills,
      onlineServices,
      classrooms,
    } = reportData;

    // داده برای نمودار سطح مدارس
    const levelData = overview?.levels
      ? Object.entries(overview.levels).map(([level, count]) => ({
          name: level,
          count,
          percentage:
            overview.total > 0 ? Math.round((count / overview.total) * 100) : 0,
        }))
      : [];

    // داده برای نمودار اتصال اینترنت
    const internetData = infrastructure?.internet
      ? Object.entries(infrastructure.internet).map(([type, count]) => ({
          name: type,
          value: count,
        }))
      : [];

    // داده برای نمودار مهارت معلمان
    const teacherSkillData = skills?.teacherSkills
      ? Object.entries(skills.teacherSkills).map(([level, count]) => ({
          name: level,
          count,
        }))
      : [];

    return (
      <div className="space-y-6">
        {/* راهنمای کلی */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="text-blue-500 mt-1 flex-shrink-0" />
            <div className="w-full">
              <h3 className="font-semibold text-blue-800 mb-4">
                راهنمای محاسبه امتیاز مدرسه هوشمند (حداکثر 100 امتیاز)
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* بخش اول: تقسیم‌بندی کلی */}
                <div>
                  <h4 className="font-medium text-blue-800 mb-3">
                    📊 تقسیم‌بندی امتیازات:
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>🌐 زیرساخت فنی (اینترنت، وای‌فای)</span>
                      <span className="font-bold text-blue-600">25 امتیاز</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>💻 تجهیزات (کامپیوتر، تخته هوشمند)</span>
                      <span className="font-bold text-blue-600">25 امتیاز</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>🎓 آموزش و مهارت (معلمان، دانش‌آموزان)</span>
                      <span className="font-bold text-blue-600">20 امتیاز</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>🌐 خدمات آنلاین (کلاس، آزمون)</span>
                      <span className="font-bold text-blue-600">15 امتیاز</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>🏫 کلاس‌های هوشمند (درصدی)</span>
                      <span className="font-bold text-blue-600">10 امتیاز</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span>📋 سایر موارد</span>
                      <span className="font-bold text-blue-600">5 امتیاز</span>
                    </div>
                  </div>
                </div>

                {/* بخش دوم: جزئیات محاسبه */}
                <div>
                  <h4 className="font-medium text-blue-800 mb-3">
                    🔢 نحوه محاسبه کلاس‌های هوشمند:
                  </h4>
                  <div className="bg-white rounded p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>
                        درصد کلاس‌های هوشمند = (تعداد کلاس هوشمند ÷ کل کلاس‌ها)
                        × 100
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>امتیاز = درصد × 0.1 (حداکثر 10 امتیاز)</span>
                    </div>
                    <div className="mt-3 p-2 bg-green-50 rounded text-xs">
                      <strong>مثال:</strong> مدرسه با 12 کلاس که 8 کلاس آن
                      هوشمند است:
                      <br />
                      درصد = (8 ÷ 12) × 100 = 67%
                      <br />
                      امتیاز = 67 × 0.1 = 6.7 امتیاز
                    </div>
                  </div>

                  <h4 className="font-medium text-blue-800 mb-2 mt-4">
                    🎯 معیارهای سطح‌بندی:
                  </h4>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>ابتدایی: زیر 40 امتیاز</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>مقدماتی: 40-59 امتیاز</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>متوسط: 60-79 امتیاز</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>پیشرفته: 80+ امتیاز</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* آمار کلی */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-100 rounded-lg p-6 text-center">
            <FaBrain className="mx-auto text-4xl text-blue-600 mb-2" />
            <h3 className="text-lg font-semibold text-blue-800">کل مدارس</h3>
            <p className="text-3xl font-bold text-blue-600">
              {overview?.total || 0}
            </p>
          </div>

          <div className="bg-green-100 rounded-lg p-6 text-center">
            <FaTachometerAlt className="mx-auto text-4xl text-green-600 mb-2" />
            <h3 className="text-lg font-semibold text-green-800">
              میانگین امتیاز
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {overview?.averageScore || 0}
            </p>
          </div>

          <div className="bg-purple-100 rounded-lg p-6 text-center">
            <FaGraduationCap className="mx-auto text-4xl text-purple-600 mb-2" />
            <h3 className="text-lg font-semibold text-purple-800">
              کل کلاس‌ها
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {classrooms?.totalClassrooms || 0}
            </p>
          </div>

          <div className="bg-indigo-100 rounded-lg p-6 text-center">
            <FaTv className="mx-auto text-4xl text-indigo-600 mb-2" />
            <h3 className="text-lg font-semibold text-indigo-800">
              کلاس‌های هوشمند
            </h3>
            <p className="text-3xl font-bold text-indigo-600">
              {classrooms?.totalSmartClassrooms || 0}
            </p>
          </div>
        </div>

        {/* آمار اضافی کلاس‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-orange-100 rounded-lg p-6 text-center">
            <FaChartBar className="mx-auto text-4xl text-orange-600 mb-2" />
            <h3 className="text-lg font-semibold text-orange-800">
              درصد کلاس‌های هوشمند
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {classrooms?.averageSmartClassroomPercentage || 0}%
            </p>
          </div>

          <div className="bg-cyan-100 rounded-lg p-6 text-center">
            <FaDesktop className="mx-auto text-4xl text-cyan-600 mb-2" />
            <h3 className="text-lg font-semibold text-cyan-800">کل کامپیوتر</h3>
            <p className="text-3xl font-bold text-cyan-600">
              {equipment?.totalComputers || 0}
            </p>
          </div>

          <div className="bg-yellow-100 rounded-lg p-6 text-center">
            <FaWifi className="mx-auto text-4xl text-yellow-600 mb-2" />
            <h3 className="text-lg font-semibold text-yellow-800">
              دارای وای‌فای
            </h3>
            <p className="text-3xl font-bold text-yellow-600">
              {infrastructure?.wifi?.available || 0}
            </p>
          </div>
        </div>

        {/* نمودارهای اصلی */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* نمودار سطح مدارس */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              توزیع مدارس بر اساس سطح
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* نمودار نوع اتصال اینترنت */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">نوع اتصال اینترنت</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={internetData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {internetData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* نمودار مهارت معلمان */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              سطح مهارت فناوری معلمان
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teacherSkillData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* آمار تجهیزات */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">آمار تجهیزات</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>کامپیوتر</span>
                <span className="font-bold">
                  {equipment?.totalComputers || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>لپ‌تاپ</span>
                <span className="font-bold">
                  {equipment?.totalLaptops || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>تبلت</span>
                <span className="font-bold">
                  {equipment?.totalTablets || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>تخته هوشمند</span>
                <span className="font-bold">
                  {equipment?.totalSmartBoards || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>ویدئو پروژکتور</span>
                <span className="font-bold">
                  {equipment?.totalProjectors || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* آمار کلاس‌ها */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">آمار تفصیلی کلاس‌ها</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
              <span>میانگین کلاس در مدرسه</span>
              <span className="font-bold text-purple-600">
                {classrooms?.averageClassroomsPerSchool || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded">
              <span>میانگین کلاس هوشمند</span>
              <span className="font-bold text-indigo-600">
                {classrooms?.averageSmartClassroomsPerSchool || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span>مدارس دارای کلاس هوشمند</span>
              <span className="font-bold text-green-600">
                {classrooms?.schoolsWithSmartClassrooms || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span>میانگین درصد هوشمندسازی</span>
              <span className="font-bold text-orange-600">
                {classrooms?.averageSmartClassroomPercentage || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* آمار نرم‌افزار و خدمات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">نرم‌افزار و امنیت</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>نرم‌افزار مدیریت</span>
                <span className="font-bold text-green-600">
                  {software?.hasManagementSoftware || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>آنتی‌ویروس</span>
                <span className="font-bold text-green-600">
                  {software?.hasAntivirus || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>سیستم پشتیبان‌گیری</span>
                <span className="font-bold text-green-600">
                  {software?.hasBackup || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>فایروال</span>
                <span className="font-bold text-green-600">
                  {software?.hasFirewall || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">خدمات آنلاین</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>کلاس آنلاین</span>
                <span className="font-bold text-blue-600">
                  {onlineServices?.onlineClasses || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>پلتفرم آموزش الکترونیکی</span>
                <span className="font-bold text-blue-600">
                  {onlineServices?.elearning || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>کتابخانه دیجیتال</span>
                <span className="font-bold text-blue-600">
                  {onlineServices?.digitalLibrary || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>آزمون آنلاین</span>
                <span className="font-bold text-blue-600">
                  {onlineServices?.onlineExams || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedReport = () => {
    if (!reportData || !Array.isArray(reportData)) return null;

    const handleSchoolClick = (schoolCode) => {
      // رفتن به صفحه جزئیات مدرسه
      const detailUrl = `/dashboard/smart-school?examCenter=${schoolCode}&view=details`;
      window.open(detailUrl, "_blank");
    };

    // فیلتر کردن مدارس بر اساس جستجو
    const filteredSchools = reportData.filter((school) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase().trim();
      const schoolCode = (school?.examCenterCode || "").toLowerCase();
      const schoolName = (school?.examCenterName || "").toLowerCase();

      return (
        schoolCode.includes(searchLower) || schoolName.includes(searchLower)
      );
    });

    const clearSearch = () => {
      setSearchTerm("");
    };

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">
              جزئیات تمام مدارس (کلیک برای مشاهده جزئیات)
            </h3>

            {/* بخش جستجو */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو بر اساس کد یا نام مدرسه..."
                  className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  >
                    <FaTimes className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* نمایش تعداد نتایج */}
              <div className="text-sm text-gray-600 whitespace-nowrap">
                {searchTerm ? (
                  <span>
                    {filteredSchools.length} از {reportData.length} مدرسه
                  </span>
                ) : (
                  <span>{reportData.length} مدرسه</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کد مرکز
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام مرکز
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  امتیاز
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  سطح
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کل کلاس
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کلاس هوشمند
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  درصد هوشمند
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اینترنت
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کامپیوتر
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  مهارت معلم
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخرین بروزرسانی
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <FaSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm
                          ? "نتیجه‌ای یافت نشد"
                          : "هیچ مدرسه‌ای یافت نشد"}
                      </h3>
                      <p className="text-sm">
                        {searchTerm
                          ? `برای جستجوی "${searchTerm}" نتیجه‌ای یافت نشد. لطفاً عبارت دیگری امتحان کنید.`
                          : "در حال حاضر هیچ داده‌ای برای نمایش وجود ندارد."}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={clearSearch}
                          className="mt-3 text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          پاک کردن جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchools?.map((school, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer text-right"
                    onClick={() => handleSchoolClick(school?.examCenterCode)}
                    title="کلیک برای مشاهده جزئیات مدرسه"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {school?.examCenterCode || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                      {school?.examCenterName || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (school?.smartSchoolScore || 0) >= 80
                            ? "bg-green-100 text-green-800"
                            : (school?.smartSchoolScore || 0) >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : (school?.smartSchoolScore || 0) >= 40
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {school?.smartSchoolScore || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {school?.level || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="font-medium">
                        {school?.classrooms?.totalClassrooms || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="font-medium text-blue-600">
                        {school?.classrooms?.smartClassrooms || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span
                        className={`font-medium ${
                          (school?.classrooms?.smartClassroomPercentage || 0) >=
                          60
                            ? "text-green-600"
                            : (school?.classrooms?.smartClassroomPercentage ||
                                0) >= 30
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {school?.classrooms?.smartClassroomPercentage || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {school?.infrastructure?.internetConnection || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {school?.equipment?.computers || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {school?.skills?.teacherLevel || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {school?.lastUpdate
                        ? new Date(school.lastUpdate).toLocaleDateString(
                            "fa-IR"
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSchoolClick(school?.examCenterCode);
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                      >
                        <FaEye className="mr-1" />
                        مشاهده جزئیات
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonReport = () => {
    if (!reportData) return null;

    const comparisonData = reportData
      ? Object.entries(reportData).map(([level, data]) => ({
          level,
          count: data?.count || 0,
          averageScore: Math.round(data?.averageScore || 0),
          computers: Math.round(data?.averageEquipment?.computers || 0),
          فیبر: data?.internetTypes?.فیبر || 0,
          ADSL: data?.internetTypes?.ADSL || 0,
          ندارد: data?.internetTypes?.ندارد || 0,
        }))
      : [];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">مقایسه سطوح مدارس</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="تعداد مدارس" />
              <Bar
                dataKey="averageScore"
                fill="#82ca9d"
                name="میانگین امتیاز"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              میانگین تجهیزات به تفکیک سطح
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="computers" fill="#ffc658" name="کامپیوتر" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              نوع اینترنت به تفکیک سطح
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="فیبر" fill="#0088FE" name="فیبر نوری" />
                <Bar dataKey="ADSL" fill="#00C49F" name="ADSL" />
                <Bar dataKey="ندارد" fill="#FF8042" name="ندارد" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderImprovementsReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaExclamationTriangle className="text-orange-500" />
            <h3 className="text-lg font-semibold">مدارس نیازمند بهبود</h3>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">
              {reportData.totalSchoolsNeedingImprovement}
            </p>
            <p className="text-orange-800">
              مدرسه نیازمند بهبود (امتیاز زیر 80)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">اولویت‌های بهبود</h3>
          <div className="space-y-3">
            {reportData?.prioritizedImprovements?.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <span className="font-medium">{item.priority}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {item.count} مدرسه
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            جزئیات مدارس نیازمند بهبود
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    کد مرکز
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    نام مرکز
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    امتیاز
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    کل کلاس
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    کلاس هوشمند
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    درصد هوشمند
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    اولویت‌های بهبود
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.schoolsByPriority?.map((school, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {school?.examCenterCode || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                      {school?.examCenterName || "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (school?.score || 0) >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : (school?.score || 0) >= 40
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {school?.score || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="font-medium">
                        {school?.totalClassrooms || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="font-medium text-blue-600">
                        {school?.smartClassrooms || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span
                        className={`font-medium ${
                          (school?.smartClassroomPercentage || 0) >= 60
                            ? "text-green-600"
                            : (school?.smartClassroomPercentage || 0) >= 30
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {school?.smartClassroomPercentage || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {school.priorities?.map((priority, pIndex) => (
                          <span
                            key={pIndex}
                            className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded"
                          >
                            {priority}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSchoolsList = () => {
    if (!reportData) return null;

    // استخراج لیست مدارس از گزارش detailed
    // اگر reportData خود یک آرایه است، از آن استفاده کن
    const schools = Array.isArray(reportData)
      ? reportData
      : reportData.schools || [];

    const handleSchoolClick = (schoolCode) => {
      // رفتن به صفحه جزئیات مدرسه (می‌توانید URL مناسب را تعریف کنید)
      const detailUrl = `/dashboard/smart-school?examCenter=${schoolCode}&view=details`;
      window.open(detailUrl, "_blank");
    };

    return (
      <div className="space-y-6">
        {/* آمار کلی مدارس منطقه */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <FaBrain className="mx-auto text-3xl text-blue-600 mb-2" />
            <h3 className="text-lg font-semibold text-blue-800">کل مدارس</h3>
            <p className="text-2xl font-bold text-blue-600">{schools.length}</p>
          </div>
          <div className="bg-green-100 rounded-lg p-4 text-center">
            <FaChartBar className="mx-auto text-3xl text-green-600 mb-2" />
            <h3 className="text-lg font-semibold text-green-800">
              میانگین امتیاز
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {schools.length > 0
                ? Math.round(
                    (schools.reduce(
                      (sum, s) => sum + (s.smartSchoolScore || 0),
                      0
                    ) /
                      schools.length) *
                      10
                  ) / 10
                : 0}
            </p>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 text-center">
            <FaTv className="mx-auto text-3xl text-purple-600 mb-2" />
            <h3 className="text-lg font-semibold text-purple-800">
              کل کلاس‌ها
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {schools.reduce(
                (sum, s) => sum + (s.classrooms?.totalClassrooms || 0),
                0
              )}
            </p>
          </div>
          <div className="bg-orange-100 rounded-lg p-4 text-center">
            <FaDesktop className="mx-auto text-3xl text-orange-600 mb-2" />
            <h3 className="text-lg font-semibold text-orange-800">
              کلاس‌های هوشمند
            </h3>
            <p className="text-2xl font-bold text-orange-600">
              {schools.reduce(
                (sum, s) => sum + (s.classrooms?.smartClassrooms || 0),
                0
              )}
            </p>
          </div>
        </div>

        {/* جدول مدارس */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              لیست مدارس منطقه {selectedDistrictName} (کلیک برای مشاهده جزئیات)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کد مرکز
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نام مرکز
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    امتیاز
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کل کلاس‌ها
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کلاس‌های هوشمند
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    درصد هوشمندسازی
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وای‌فای
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schools.map((school, index) => (
                  <tr
                    key={school.examCenterCode}
                    className="hover:bg-gray-50 cursor-pointer text-right"
                    onClick={() => handleSchoolClick(school.examCenterCode)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {school.examCenterCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {school.examCenterName || `مرکز ${school.examCenterCode}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          (school.smartSchoolScore || 0) >= 80
                            ? "bg-green-100 text-green-800"
                            : (school.smartSchoolScore || 0) >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : (school.smartSchoolScore || 0) >= 40
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {school.smartSchoolScore || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {school.classrooms?.totalClassrooms || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {school.classrooms?.smartClassrooms || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`text-sm font-medium ${
                          (school.classrooms?.smartClassroomPercentage || 0) >=
                          60
                            ? "text-green-600"
                            : (school.classrooms?.smartClassroomPercentage ||
                                0) >= 30
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {school.classrooms?.smartClassroomPercentage || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {school.infrastructure?.wifiAvailable ? "✅" : "❌"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSchoolClick(school.examCenterCode);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        مشاهده جزئیات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDistrictsReport = () => {
    if (!reportData) return null;

    // برای کارشناس فناوری منطقه، همیشه لیست مدارس نمایش داده شود
    if (
      user?.role === "districtTechExpert" ||
      user?.role === "DISTRICT_TECH_EXPERT"
    ) {
      return renderSchoolsList();
    }

    // اگر فیلتر منطقه اعمال شده، لیست مدارس را نمایش بده
    if (selectedDistrictName) {
      return renderSchoolsList();
    }

    const { districts = [], summary = {} } = reportData;

    const handleDistrictClick = (districtCode) => {
      // ایجاد URL با فیلتر منطقه
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("district", districtCode);
      currentUrl.searchParams.set("tab", "detailed");

      // رفتن به صفحه جزئیات با فیلتر منطقه
      window.open(currentUrl.toString(), "_blank");
    };

    return (
      <div className="space-y-6">
        {/* آمار کلی مناطق */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <FaMapMarkedAlt className="mx-auto text-3xl text-blue-600 mb-2" />
            <h3 className="text-lg font-semibold text-blue-800">کل مناطق</h3>
            <p className="text-2xl font-bold text-blue-600">
              {summary.totalDistricts || 0}
            </p>
          </div>
          <div className="bg-green-100 rounded-lg p-4 text-center">
            <FaBrain className="mx-auto text-3xl text-green-600 mb-2" />
            <h3 className="text-lg font-semibold text-green-800">کل مدارس</h3>
            <p className="text-2xl font-bold text-green-600">
              {summary.totalSchools || 0}
            </p>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 text-center">
            <FaTachometerAlt className="mx-auto text-3xl text-purple-600 mb-2" />
            <h3 className="text-lg font-semibold text-purple-800">
              میانگین کل
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {summary.overallAverageScore || 0}
            </p>
          </div>
          <div className="bg-yellow-100 rounded-lg p-4 text-center">
            <FaChartBar className="mx-auto text-3xl text-yellow-600 mb-2" />
            <h3 className="text-lg font-semibold text-yellow-800">
              بهترین منطقه
            </h3>
            <p className="text-sm font-bold text-yellow-600">
              {summary.bestDistrict?.districtName || "-"}
            </p>
            <p className="text-lg font-bold text-yellow-600">
              {summary.bestDistrict?.averageScore || 0}
            </p>
          </div>
        </div>

        {/* نمودار مقایسه مناطق */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">مقایسه امتیاز مناطق</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={districts}
              margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="districtName"
                angle={45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageScore" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* جدول تفصیلی مناطق */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              جزئیات مناطق (کلیک برای مشاهده جزئیات)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    منطقه
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تعداد مدارس
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    میانگین امتیاز
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کل کلاس‌ها
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کلاس‌های هوشمند
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    درصد هوشمندسازی
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وای‌فای
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {districts.map((district, index) => (
                  <tr
                    key={district.districtCode}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleDistrictClick(district.districtCode)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaMapMarkedAlt className="text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {district.districtName}
                          </div>
                          <div className="text-sm text-gray-500">
                            کد: {district.districtCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {district.totalSchools}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          district.averageScore >= 80
                            ? "bg-green-100 text-green-800"
                            : district.averageScore >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : district.averageScore >= 40
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {district.averageScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {district.totalClassrooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {district.totalSmartClassrooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`text-sm font-medium ${
                          district.smartClassroomPercentage >= 60
                            ? "text-green-600"
                            : district.smartClassroomPercentage >= 30
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {district.smartClassroomPercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        {district.infrastructure?.wifiPercentage || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDistrictClick(district.districtCode);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        مشاهده جزئیات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartBar className="text-blue-600" />
            گزارش مدرسه هوشمند
            {selectedDistrictName && (
              <span className="text-lg text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                منطقه {selectedDistrictName}
              </span>
            )}
          </h1>
          <ScoreLegend />
          {selectedDistrictName && (
            <button
              onClick={() => {
                // حذف پارامترهای URL و بازگشت به نمای کلی
                const url = new URL(window.location.href);
                url.searchParams.delete("district");
                url.searchParams.delete("tab");
                window.location.href = url.toString();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <FaMapMarkedAlt />
              نمایش همه مناطق
            </button>
          )}
        </div>
        <button
          onClick={downloadReport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <FaDownload />
          دانلود گزارش
        </button>
      </div>

      {/* تب‌ها */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: "summary", label: "خلاصه", icon: FaTachometerAlt },
              { id: "detailed", label: "جزئیات", icon: FaEye },
              {
                id: "comparison",
                label: selectedDistrictName ? "مقایسه مدارس" : "مقایسه",
                icon: FaChartBar,
              },
              {
                id: "improvements",
                label: "بهبود",
                icon: FaExclamationTriangle,
              },
              ...(user?.role === "provinceTechExpert" ||
              user?.role === "PROVINCE_TECH_EXPERT" ||
              user?.role === "districtTechExpert" ||
              user?.role === "DISTRICT_TECH_EXPERT"
                ? [
                    {
                      id: "districts",
                      label:
                        user?.role === "districtTechExpert" ||
                        user?.role === "DISTRICT_TECH_EXPERT"
                          ? "مقایسه مدارس"
                          : selectedDistrictName
                          ? "مقایسه مدارس"
                          : "مقایسه مناطق",
                      icon:
                        user?.role === "districtTechExpert" ||
                        user?.role === "DISTRICT_TECH_EXPERT"
                          ? FaBrain
                          : selectedDistrictName
                          ? FaBrain
                          : FaMapMarkedAlt,
                    },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "summary" && renderSummaryReport()}
          {activeTab === "detailed" && renderDetailedReport()}
          {activeTab === "comparison" && renderComparisonReport()}
          {activeTab === "improvements" && renderImprovementsReport()}
          {activeTab === "districts" && renderDistrictsReport()}
        </div>
      </div>
    </div>
  );
}
