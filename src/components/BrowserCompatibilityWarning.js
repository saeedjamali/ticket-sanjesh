"use client";

import { useEffect, useState } from "react";

const BrowserCompatibilityWarning = () => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // اضافه کردن کلاس CSS به body هنگام نمایش banner
    if (showWarning) {
      document.body.classList.add("has-browser-warning");
    } else {
      document.body.classList.remove("has-browser-warning");
    }

    // cleanup هنگام unmount
    return () => {
      document.body.classList.remove("has-browser-warning");
    };
  }, [showWarning]);

  useEffect(() => {
    // بررسی نسخه مرورگر و مقایسه با آخرین نسخه‌ها
    const checkBrowserVersion = () => {
      try {
        const userAgent = navigator.userAgent;

        // آخرین نسخه‌های شناخته شده (تاریخ: دسامبر 2024)
        const latestVersions = {
          chrome: 131, // Chrome 131 (دسامبر 2024)
          firefox: 133, // Firefox 133 (دسامبر 2024)
          safari: 18, // Safari 18 (سپتامبر 2024)
          edge: 131, // Edge 131 (دسامبر 2024)
        };

        let browserName = "";
        let currentVersion = 0;
        let isOutdated = false;

        // تشخیص Chrome
        if (/Chrome\/(\d+)/.test(userAgent) && !/Edg/.test(userAgent)) {
          browserName = "Chrome";
          currentVersion = parseInt(RegExp.$1);
          isOutdated = currentVersion < latestVersions.chrome;
        }
        // تشخیص Firefox
        else if (/Firefox\/(\d+)/.test(userAgent)) {
          browserName = "Firefox";
          currentVersion = parseInt(RegExp.$1);
          isOutdated = currentVersion < latestVersions.firefox;
        }
        // تشخیص Safari
        else if (
          /Version\/(\d+).*Safari/.test(userAgent) &&
          !/Chrome|Edg/.test(userAgent)
        ) {
          browserName = "Safari";
          currentVersion = parseInt(RegExp.$1);
          isOutdated = currentVersion < latestVersions.safari;
        }
        // تشخیص Edge
        else if (/Edg\/(\d+)/.test(userAgent)) {
          browserName = "Edge";
          currentVersion = parseInt(RegExp.$1);
          isOutdated = currentVersion < latestVersions.edge;
        }
        // تشخیص IE
        else if (/MSIE|Trident/.test(userAgent)) {
          browserName = "Internet Explorer";
          isOutdated = true; // IE همیشه قدیمی محسوب می‌شود
        }

        // نمایش هشدار اگر مرورگر بروز نباشد
        if (isOutdated) {
          setShowWarning(true);
          console.log(
            `مرورگر ${browserName} نسخه ${currentVersion} بروز نیست.`
          );
        }
      } catch (error) {
        // اگر خطایی رخ داد، هشدار نمایش داده نشود
        console.log("خطا در تشخیص نسخه مرورگر:", error);
      }
    };

    checkBrowserVersion();
  }, []);

  if (!showWarning) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#f39c12",
        color: "#ffffff",
        zIndex: 9999,
        padding: "12px 20px",
        textAlign: "center",
        fontFamily: "Tahoma, Arial, sans-serif",
        direction: "rtl",
        fontSize: "14px",
        fontWeight: "bold",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        borderBottom: "2px solid #e67e22",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* آیکون هشدار */}
        <span style={{ fontSize: "18px" }}>⚠️</span>

        {/* متن هشدار */}
        <span>
          مرورگر شما بروز نیست و ممکن است با مشکل مواجه شوید - لطفاً به‌روزرسانی
          کنید
        </span>

        {/* دکمه‌ها */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() =>
              window.open("https://www.google.com/chrome/", "_blank")
            }
            style={{
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            به‌روزرسانی
          </button>

          <button
            onClick={() => setShowWarning(false)}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "1px solid white",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowserCompatibilityWarning;
