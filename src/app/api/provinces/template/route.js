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
      ["نام استان", "کد استان", "سال تحصیلی"],
      ["تهران", "THR", "1403-1404"],
      ["اصفهان", "ISF", "1403-1404"],
      ["راهنما:", "کد استان باید منحصربفرد باشد", "اختیاری"],
    ];

    // ایجاد و تنظیم ورک‌شیت
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // تنظیم عرض ستون‌ها
    const cols = [
      { wch: 25 }, // نام استان
      { wch: 15 }, // کد استان
      { wch: 15 }, // سال تحصیلی
    ];

    worksheet["!cols"] = cols;

    // اضافه کردن ورک‌شیت به کتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, "استان‌ها");

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ایجاد پاسخ با فایل اکسل
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_provinces.xlsx"',
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
