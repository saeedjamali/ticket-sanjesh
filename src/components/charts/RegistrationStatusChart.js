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
import { FaEye, FaEyeSlash, FaDownload, FaCamera } from "react-icons/fa";

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
  const chartRef = useRef();
  const [isVisible, setIsVisible] = useState(true);

  // تبدیل داده‌ها به فرمت مناسب برای نمودار
  const chartData = {
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

  const options = {
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
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "مناطق",
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
      ctx.fillText(title, canvas.width / 2, 30);

      // اضافه کردن تاریخ گزارش
      const currentDate = new Date().toLocaleDateString("fa-IR");
      ctx.font = "14px Arial";
      ctx.fillText(`تاریخ گزارش: ${currentDate}`, canvas.width / 2, 55);

      // اضافه کردن نمودار اصلی
      ctx.drawImage(chart.canvas, 50, 80);

      // دانلود تصویر
      const link = document.createElement("a");
      link.download = `registration-status-chart-${
        new Date().toISOString().split("T")[0]
      }.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
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
        <h3 className="text-lg font-semibold text-gray-800">
          نمودار وضعیت ثبت نام مناطق
        </h3>
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

      {data.length > 0 ? (
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

      {/* راهنمای رنگ‌ها */}
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
      </div>
    </div>
  );
}
