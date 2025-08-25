// تنظیمات اطلاعیه‌های مهم
export const NOTICE_CONFIG = {
  // آی‌دی منحصر به فرد برای هر اطلاعیه - با تغییر این آی‌دی، اطلاعیه مجدداً نمایش داده می‌شود
  id: "important-notice-2024-001",

  // وضعیت فعال/غیرفعال بودن اطلاعیه
  isActive: false,

  // محتوای اطلاعیه
  content: {
    title: "توجه : ",
    description: [
      "همکار گرامی، جهت ورود اولیه به سامانه، نام کاربری و رمز ورود پیش فرض برابر کد ملی (بصورت 10 رقمی) تعیین شده است. ضروری است بعد از اولین ورود و انجام فرآیند احراز هویت از طریق شماره تلفن همراه، نسبت به تعیین رمز عبور اصلی خود از طریق منوی پیشخوان، اقدام نمائید.",
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
