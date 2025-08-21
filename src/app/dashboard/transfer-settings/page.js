"use client";

import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import Link from "next/link";
import {
  FaClipboard,
  FaExchangeAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCogs,
} from "react-icons/fa";

export default function TransferSettingsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserContext();

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // بررسی دسترسی
  if (!user || !["systemAdmin", "provinceTransferExpert"].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  const settingsCards = [
    {
      title: "تذکرات اولیه",
      description: "مدیریت کدها و عناوین تذکرات اولیه سیستم انتقال",
      icon: <FaClipboard className="h-8 w-8" />,
      path: "/dashboard/transfer-settings/preliminary-notices",
      color: "blue",
    },
    {
      title: "علل انتقال",
      description: "مدیریت علل و دلایل مختلف انتقال دانش‌آموزان",
      icon: <FaExchangeAlt className="h-8 w-8" />,
      path: "/dashboard/transfer-settings/transfer-reasons",
      color: "green",
    },
    {
      title: "دلایل موافقت/مخالفت",
      description: "مدیریت دلایل موافقت یا مخالفت با درخواست‌های انتقال",
      icon: <FaCogs className="h-8 w-8" />,
      path: "/dashboard/transfer-settings/approval-reasons",
      color: "purple",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        hover: "hover:bg-blue-100",
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: "text-green-600",
        hover: "hover:bg-green-100",
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        icon: "text-purple-600",
        hover: "hover:bg-purple-100",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تنظیمات انتقالات</h1>
          <p className="text-gray-600 mt-1">
            مدیریت تنظیمات و پیکربندی سیستم انتقال دانش‌آموزان
          </p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card, index) => {
          const colorClasses = getColorClasses(card.color);

          return (
            <Link
              key={index}
              href={card.path}
              className={`block p-6 rounded-lg border-2 transition-all duration-200 ${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover} hover:shadow-md`}
            >
              <div className="flex items-start space-x-4 space-x-reverse">
                <div className={`${colorClasses.icon} flex-shrink-0`}>
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{card.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3 space-x-reverse">
          <div className="text-blue-600 flex-shrink-0 mt-1">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">
              راهنمای استفاده
            </h4>
            <p className="text-sm text-blue-700">
              از طریق بخش‌های بالا می‌توانید تنظیمات مربوط به سیستم انتقال
              دانش‌آموزان را مدیریت کنید. هر تغییری که در این بخش‌ها اعمال کنید،
              بلافاصله در تمام سیستم اعمال خواهد شد.
            </p>
          </div>
        </div>
      </div>

      {/* User Role Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="text-gray-600">
            <FaCogs className="h-4 w-4" />
          </div>
          <span className="text-sm text-gray-600">
            دسترسی شما:{" "}
            <span className="font-semibold">
              {user.role === "systemAdmin"
                ? "مدیر سیستم"
                : "کارشناس امور اداری استان"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
