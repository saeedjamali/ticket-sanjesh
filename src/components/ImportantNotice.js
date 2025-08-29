"use client";

import { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaTimes,
  FaBell,
  FaRegBell,
} from "react-icons/fa";
import { NOTICE_CONFIG, getNoticeColors } from "@/lib/noticeConfig";

const ImportantNotice = () => {
  const [isVisible, setIsVisible] = useState(false);

  // اطلاعیه را از localStorage چک کن
  useEffect(() => {
    // بررسی اینکه آیا اطلاعیه فعال است
    if (!NOTICE_CONFIG.isActive) {
      setIsVisible(false);
      return;
    }

    const dismissedNotices = JSON.parse(
      localStorage.getItem("dismissedNotices") || "[]"
    );

    // اگر این اطلاعیه قبلاً بسته نشده، نمایش بده
    if (!dismissedNotices.includes(NOTICE_CONFIG.id)) {
      setIsVisible(true);
    }
  }, []);

  // بستن اطلاعیه
  const dismissNotice = () => {
    const dismissedNotices = JSON.parse(
      localStorage.getItem("dismissedNotices") || "[]"
    );

    // // اضافه کردن این اطلاعیه به لیست بسته شده‌ها
    // const updatedDismissed = [...dismissedNotices, NOTICE_CONFIG.id];
    // localStorage.setItem("dismissedNotices", JSON.stringify(updatedDismissed));

    setIsVisible(false);
  };

  // اضافه کردن کلاس به body برای ایجاد فضا
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add("has-important-notice");
    } else {
      document.body.classList.remove("has-important-notice");
    }

    // پاک کردن کلاس هنگام unmount
    return () => {
      document.body.classList.remove("has-important-notice");
    };
  }, [isVisible]);

  //   if (!isVisible) return null;

  // دریافت رنگ بر اساس نوع
  const gradientColors = getNoticeColors(NOTICE_CONFIG.styling.type);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 transform transition-all duration-300 ease-in-out">
      <div
        className={`bg-gradient-to-r ${gradientColors} text-white shadow-lg`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            {/* آیکن و محتوا */}
            <div className="flex items-start gap-3 flex-1">
              {/* آیکن */}
              {/* <div className="flex-shrink-0 mt-1">
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                  <FaRegBell className="h-5 w-5 text-white" />
                </div>
              </div> */}

              {/* محتوای اطلاعیه */}
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold  mb-2 flex items-center gap-2 md:text-2xl text-xl">
                  <FaExclamationTriangle className="h-4 w-4 text-yellow-200" />
                  {NOTICE_CONFIG.content.title}
                </h3>

                <div className="md:text-lg text-sm leading-relaxed space-y-1 mt-4">
                  {NOTICE_CONFIG.content.description.map((paragraph, index) => (
                    <p
                      key={index}
                      className={
                        paragraph === NOTICE_CONFIG.content.highlightText
                          ? "text-yellow-200 font-medium"
                          : ""
                      }
                    >
                      {index === 0 ? <strong>{paragraph}</strong> : paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* دکمه بستن */}
            {/* <button
              onClick={dismissNotice}
              className="flex-shrink-0 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors duration-200 group border border-white border-opacity-30"
              title="بستن اطلاعیه"
            >
              <FaTimes className="h-4 w-4 text-white bg-amber-400- group-hover:text-gray-100" />
            </button> */}
          </div>
        </div>
      </div>

      {/* سایه زیر banner */}
      <div
        className={`h-1 bg-gradient-to-r ${gradientColors} opacity-70`}
      ></div>
    </div>
  );
};

export default ImportantNotice;
