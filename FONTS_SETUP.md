# 🎨 Font Setup Guide - راهنمای تنظیم فونت‌ها

## 🚨 مشکل Build Error با Google Fonts

خطای `ETIMEDOUT` هنگام build به دلیل عدم دسترسی به Google Fonts رخ می‌دهد:

```
Failed to fetch `Roboto Mono` from Google Fonts.
[AggregateError: ] { code: 'ETIMEDOUT' }
```

## ✅ راه‌حل: استفاده از فونت‌های Local

### 🔧 تغییرات انجام‌شده:

1. **حذف Google Fonts از `layout.js`**
2. **استفاده از System Font Fallbacks**
3. **آماده‌سازی ساختار برای فونت‌های local**

### 📁 ساختار فولدر فونت‌ها:

```
public/fonts/
├── inter/          (فونت انگلیسی - اختیاری)
├── roboto-mono/    (فونت monospace - اختیاری)
├── iransans/       (فونت فارسی - موجود)
├── iranyekan/      (فونت فارسی - موجود)
└── shabnam/        (فونت فارسی - موجود)
```

## 🌐 دانلود فونت‌های مورد نیاز (اختیاری)

### 📥 Inter Font:

1. برو به: https://fonts.google.com/specimen/Inter
2. کلیک "Download family"
3. فایل‌های `.woff2` را در `public/fonts/inter/` قرار بده:
   - `Inter-Regular.woff2`
   - `Inter-Medium.woff2`
   - `Inter-SemiBold.woff2`
   - `Inter-Bold.woff2`

### 📥 Roboto Mono Font:

1. برو به: https://fonts.google.com/specimen/Roboto+Mono
2. کلیک "Download family"
3. فایل‌های `.woff2` را در `public/fonts/roboto-mono/` قرار بده:
   - `RobotoMono-Regular.woff2`
   - `RobotoMono-Medium.woff2`
   - `RobotoMono-Bold.woff2`

### 🔓 فعال‌سازی فونت‌های Local:

بعد از دانلود فونت‌ها، در فایل `src/style/font.css`:

1. خط‌های comment شده `@font-face` را uncomment کن
2. مطمئن شو نام فایل‌ها درست هست

## 🎯 وضعیت فعلی:

### ✅ کار می‌کند:

- **فونت‌های فارسی**: IranYekan, IRANSans, Shabnam
- **System Font Fallbacks**: برای فونت‌های انگلیسی
- **Build Process**: بدون خطای timeout

### 📋 CSS Variables تعریف‌شده:

```css
:root {
  --font-primary: "IranYekan", "IRANSans", "Shabnam", system-ui, sans-serif;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial,
    sans-serif;
  --font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
    monospace;
}
```

## 🚀 Build Commands:

```bash
# Build بدون خطای فونت
npm run build

# Development
npm run dev

# Production
npm start
```

## 🔧 Troubleshooting:

### اگر هنوز خطای فونت داری:

1. مطمئن شو تمام import های Google Fonts حذف شدن
2. `node_modules/.next` را پاک کن:
   ```bash
   rm -rf .next
   npm run build
   ```

### اگر فونت‌ها درست نمایش داده نمی‌شن:

1. چک کن فایل‌های فونت در مسیر درست باشن
2. نام فایل‌ها دقیقاً مطابق CSS باشه
3. فرمت فایل‌ها `.woff2` باشه

## 💡 مزایای این روش:

1. **🚫 خطای Build نداریم**
2. **⚡ سرعت بالاتر** (فونت‌ها local هستن)
3. **🌐 Offline Support**
4. **🎨 کیفیت یکسان** در تمام مرورگرها
5. **📱 سازگاری کامل** با mobile

---

**نکته**: فونت‌های فارسی (IranYekan, IRANSans, Shabnam) از قبل موجود و فعال هستن. فونت‌های انگلیسی (Inter, Roboto Mono) اختیاری هستن و system fonts بعنوان fallback استفاده می‌شن.
