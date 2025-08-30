// تنظیمات اطلاعیه‌های مهم
export const NOTICE_CONFIG = {
  // آی‌دی منحصر به فرد برای هر اطلاعیه - با تغییر این آی‌دی، اطلاعیه مجدداً نمایش داده می‌شود
  id: "important-notice-2024-001",

  // وضعیت فعال/غیرفعال بودن اطلاعیه
  isActive: false,

  // محتوای اطلاعیه
  content: {
    title: "اطلاعیه : ",
    description: [
      "قابل توجه متقاضیان و ثبت نام کنندگان فرایند نقل و انتقالات آموزشی درون استانی سال تحصیلی 1405-1404؛",
      "ثبت و تایید درخواست های استثناء(تجدیدنظر) در سامانه rasad.razaviedu.ir تا ساعت 24 روز یکشنبه مورخ 1404/06/09 امکان پذیر می باشد.",
      // "امکان ثبت درخواست تجدید نظر انتقالات داخل استان از ساعت 16 امروز در این سامانه فعال خواهد شد",
    ],
    // highlightText:
    //   "⚠️ .",
  },

  // تنظیمات ظاهری
  styling: {
    type: "info", // 'info', 'warning', 'error', 'success'
    colors: {
      warning: "from-orange-500 to-red-500",
      info: "from-blue-500 to-indigo-500",
      error: "from-red-500 to-pink-500",
      success: "from-green-500 to-emerald-500",
    },
  },
};

// تابع کمکی برای دریافت رنگ بر اساس نوع
export const getNoticeColors = (type = "warning") => {
  return (
    NOTICE_CONFIG.styling.colors[type] || NOTICE_CONFIG.styling.colors.warning
  );
};
