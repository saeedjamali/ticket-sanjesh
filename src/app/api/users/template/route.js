import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    // اعتبارسنجی کاربر و بررسی دسترسی
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی مدیر سیستم
    if (user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این قسمت ندارید" },
        { status: 403 }
      );
    }

    // ایجاد فایل اکسل نمونه
    const workbook = XLSX.utils.book_new();

    // تعریف ستون‌های فایل
    const data = [
      [
        "نام و نام خانوادگی",
        "کد ملی",
        "رمز عبور",
        "نقش",
        "شناسه استان",
        "شناسه منطقه",
        "شناسه مرکز آزمون",
      ],
      [
        "علی محمدی",
        "1234567890",
        "password123",
        "examCenterManager",
        "61a1234567890abcdef123456", // نمونه شناسه استان
        "61b1234567890abcdef123456", // نمونه شناسه منطقه
        "61c1234567890abcdef123456", // نمونه شناسه مرکز آزمون
      ],
      [
        "راهنما:",
        "کد ملی باید ۱۰ رقم باشد",
        "حداقل ۶ کاراکتر",
        "نقش کاربر (از لیست زیر)",
        "شناسه استان از سیستم",
        "شناسه منطقه از سیستم",
        "شناسه مرکز آزمون از سیستم",
      ],
    ];

    // اضافه کردن توضیحات نقش‌ها
    const roles = [
      ["کد نقش‌ها:", "", "", "", "", "", ""],
      ["systemAdmin", "مدیر سیستم", "", "", "", "", ""],
      ["generalManager", "مدیر کل", "", "", "", "", ""],
      ["provinceEducationExpert", "کارشناس سنجش استان", "", "", "", "", ""],
      ["provinceTechExpert", "کارشناس فناوری استان", "", "", "", "", ""],
      ["districtEducationExpert", "کارشناس سنجش منطقه", "", "", "", "", ""],
      ["districtTechExpert", "کارشناس فناوری منطقه", "", "", "", "", ""],
      ["examCenterManager", "مسئول مرکز آزمون", "", "", "", "", ""],
    ];

    // ایجاد و تنظیم ورک‌شیت
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // اضافه کردن توضیحات در ورک‌شیت دوم
    const helpSheet = XLSX.utils.aoa_to_sheet(roles);

    // تنظیم عرض ستون‌ها
    const cols = [
      { wch: 25 }, // نام و نام خانوادگی
      { wch: 15 }, // کد ملی
      { wch: 15 }, // رمز عبور
      { wch: 25 }, // نقش
      { wch: 30 }, // شناسه استان
      { wch: 30 }, // شناسه منطقه
      { wch: 30 }, // شناسه مرکز آزمون
    ];

    worksheet["!cols"] = cols;
    helpSheet["!cols"] = cols;

    // اضافه کردن ورک‌شیت‌ها به کتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, "کاربران");
    XLSX.utils.book_append_sheet(workbook, helpSheet, "راهنما");

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ایجاد پاسخ با فایل اکسل
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_users.xlsx"',
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, message: "خطا در تولید فایل نمونه" },
      { status: 500 }
    );
  }
}
