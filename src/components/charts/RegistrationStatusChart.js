"use client";

import { useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaCamera,
  FaArrowLeft,
} from "react-icons/fa";
import { useUserContext } from "@/context/UserContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function RegistrationStatusChart({
  data = [],
  currentYear = "",
  previousYear = "",
  title = "گزارش وضعیت ثبت نام مناطق",
}) {
  const { user } = useUserContext();
  const chartRef = useRef();
  const [isVisible, setIsVisible] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [viewMode, setViewMode] = useState("overview"); // 'overview' or 'detail'

  // داده‌های نمودار اصلی (نمای کلی)
  const overviewChartData = {
    labels: data.map((item) => `${item.district.name}`),
    datasets: [
      {
        label: "درصد ثبت نام",
        data: data.map((item) => item.registrationPercentage),
        backgroundColor: data.map((item) => {
          const percentage = item.registrationPercentage;
          if (percentage < 25) return "rgba(239, 68, 68, 0.8)";
          if (percentage < 75) return "rgba(245, 158, 11, 0.8)";
          if (percentage < 90) return "rgba(34, 197, 94, 0.8)";
          return "rgba(22, 163, 74, 0.8)";
        }),
        borderColor: data.map((item) => {
          const percentage = item.registrationPercentage;
          if (percentage < 25) return "rgba(239, 68, 68, 1)";
          if (percentage < 75) return "rgba(245, 158, 11, 1)";
          if (percentage < 90) return "rgba(34, 197, 94, 1)";
          return "rgba(22, 163, 74, 1)";
        }),
        borderWidth: 1,
      },
    ],
  };

  // داده‌های نمودار جزئیات (تفکیک دوره تحصیلی)
  const getDetailChartData = () => {
    if (!selectedDistrict || !selectedDistrict.periodBreakdown) return null;

    const periods = Object.keys(selectedDistrict.periodBreakdown);
    const studentCounts = periods.map(
      (period) => selectedDistrict.periodBreakdown[period].totalStudents
    );

    return {
      labels: periods,
      datasets: [
        {
          label: `تعداد دانش‌آموزان ${selectedDistrict.district.name}`,
          data: studentCounts,
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const chartData =
    viewMode === "overview" ? overviewChartData : getDetailChartData();

  // بررسی اینکه آیا کاربر می‌تواند روی منطقه کلیک کند
  const canClickOnDistrict = (district) => {
    // اگر کاربر منطقه‌ای است، فقط روی منطقه خودش می‌تواند کلیک کند
    if (user?.role === "districtRegistrationExpert") {
      return (
        user?.district === district.district._id ||
        user?.districtCode === district.district.code
      );
    }
    // سایر کاربران (مثل استانی) می‌توانند روی همه مناطق کلیک کنند
    return true;
  };

  // تنظیمات نمودار اصلی
  const overviewOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const district = data[elementIndex];

        // بررسی دسترسی کلیک
        if (canClickOnDistrict(district)) {
          setSelectedDistrict(district);
          setViewMode("detail");
        }
      }
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: "bold",
          family: "system-ui, -apple-system, sans-serif",
        },
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            const value = context.parsed.y;
            return `درصد ثبت نام: ${value}%`;
          },
          footer: function (context) {
            const elementIndex = context[0].dataIndex;
            const district = data[elementIndex];

            if (user?.role === "districtRegistrationExpert") {
              const canClick = canClickOnDistrict(district);
              return canClick
                ? "برای مشاهده جزئیات کلیک کنید"
                : "فقط منطقه خودتان قابل کلیک است";
            }
            return "برای مشاهده جزئیات کلیک کنید";
          },
        },
      },
    },
    onHover: (event, elements) => {
      // تغییر cursor بر اساس اینکه آیا روی ستون قابل کلیک هستیم یا نه
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const district = data[elementIndex];
        const canClick = canClickOnDistrict(district);
        event.native.target.style.cursor = canClick ? "pointer" : "not-allowed";
      } else {
        event.native.target.style.cursor = "default";
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text:
            user?.role === "districtRegistrationExpert"
              ? "مناطق (فقط منطقه خودتان قابل کلیک است)"
              : "مناطق (برای مشاهده جزئیات کلیک کنید)",
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            family: "system-ui, -apple-system, sans-serif",
            size: 10,
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "درصد ثبت نام",
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
        ticks: {
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
          callback: function (value) {
            return value + "%";
          },
        },
        min: 0,
        max: 100,
      },
    },
  };

  // تنظیمات نمودار جزئیات
  const detailOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: `جزئیات ${selectedDistrict?.district.name} - تفکیک دوره تحصیلی`,
        font: {
          size: 16,
          weight: "bold",
          family: "system-ui, -apple-system, sans-serif",
        },
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            const value = context.parsed.y;
            return `تعداد دانش‌آموزان: ${value.toLocaleString()} نفر`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "دوره‌های تحصیلی",
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
        ticks: {
          font: {
            family: "system-ui, -apple-system, sans-serif",
            size: 12,
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "تعداد دانش‌آموزان",
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
        },
        ticks: {
          font: {
            family: "system-ui, -apple-system, sans-serif",
          },
          callback: function (value) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  const options = viewMode === "overview" ? overviewOptions : detailOptions;

  const downloadChartAsImage = () => {
    const chart = chartRef.current;
    if (chart) {
      // ایجاد کانواس جدید برای اضافه کردن اطلاعات اضافی
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // تنظیم اندازه کانواس
      canvas.width = chart.canvas.width + 100;
      canvas.height = chart.canvas.height + 150;

      // پس‌زمینه سفید
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // اضافه کردن عنوان
      ctx.fillStyle = "black";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      const chartTitle =
        viewMode === "overview"
          ? title
          : `جزئیات ${selectedDistrict?.district.name}`;
      ctx.fillText(chartTitle, canvas.width / 2, 30);

      // اضافه کردن تاریخ گزارش
      const currentDate = new Date().toLocaleDateString("fa-IR");
      ctx.font = "14px Arial";
      ctx.fillText(`تاریخ گزارش: ${currentDate}`, canvas.width / 2, 55);

      // اضافه کردن نمودار اصلی
      ctx.drawImage(chart.canvas, 50, 80);

      // دانلود تصویر
      const link = document.createElement("a");
      const filename =
        viewMode === "overview"
          ? `registration-status-chart-${
              new Date().toISOString().split("T")[0]
            }.png`
          : `${selectedDistrict?.district.name}-detail-chart-${
              new Date().toISOString().split("T")[0]
            }.png`;
      link.download = filename;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const goBackToOverview = () => {
    setViewMode("overview");
    setSelectedDistrict(null);
  };

  if (!isVisible) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            نمودار وضعیت ثبت نام
          </h3>
          <button
            onClick={() => setIsVisible(true)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <FaEye />
            نمایش نمودار
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {viewMode === "detail" && (
            <button
              onClick={goBackToOverview}
              className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <FaArrowLeft />
              بازگشت به نمای کلی
            </button>
          )}
          <h3 className="text-lg font-semibold text-gray-800">
            {viewMode === "overview"
              ? "نمودار وضعیت ثبت نام مناطق"
              : `جزئیات ${selectedDistrict?.district.name}`}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadChartAsImage}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <FaCamera />
            دانلود تصویر
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            <FaEyeSlash />
            مخفی کردن
          </button>
        </div>
      </div>

      {data.length > 0 && chartData ? (
        <div className="h-96">
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>
      ) : (
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500 text-lg">
            داده‌ای برای نمایش در نمودار وجود ندارد
          </p>
        </div>
      )}

      {/* اطلاعات اضافی در حالت جزئیات */}
      {viewMode === "detail" && selectedDistrict && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 font-semibold">درصد ثبت نام کل</div>
              <div className="text-lg font-bold">
                {selectedDistrict.registrationPercentage}%
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 font-semibold">سال جاری</div>
              <div className="text-lg font-bold">
                {selectedDistrict.currentYearStats.totalStudents.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-gray-600 font-semibold">سال قبل</div>
              <div className="text-lg font-bold">
                {selectedDistrict.previousYearStats.totalStudents.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-purple-600 font-semibold">تعداد مدارس</div>
              <div className="text-lg font-bold">
                {selectedDistrict.examCentersCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* راهنمای رنگ‌ها - فقط در نمای کلی */}
      {viewMode === "overview" && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            راهنمای رنگ‌های درصد ثبت نام:
          </h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>کمتر از 25%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span>25% تا 75%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>75% تا 90%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
              <span>بیشتر از 90%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {user?.role === "districtRegistrationExpert"
              ? "💡 شما تمام مناطق استان را می‌بینید ولی فقط روی منطقه خودتان می‌توانید کلیک کنید"
              : "💡 برای مشاهده جزئیات هر منطقه، روی میله مربوطه کلیک کنید"}
          </p>
        </div>
      )}
    </div>
  );
}
