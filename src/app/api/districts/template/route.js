import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import Province from "@/models/Province";
import connectDB from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();

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

    // دریافت استان‌ها برای درج در فایل نمونه
    const provinces = await Province.find().select("_id name code");

    // ایجاد فایل اکسل نمونه
    const workbook = XLSX.utils.book_new();

    // تعریف ستون‌های فایل
    const data = [
      ["نام منطقه", "کد منطقه", "شناسه استان"],
      [
        "منطقه 1",
        "D001",
        provinces.length > 0
          ? provinces[0]._id.toString()
          : "6123456789abcdef12345678",
      ],
      [
        "منطقه 2",
        "D002",
        provinces.length > 0
          ? provinces[0]._id.toString()
          : "6123456789abcdef12345678",
      ],
      [
        "راهنما:",
        "کد منطقه باید منحصربفرد باشد",
        "شناسه استان باید از لیست استان‌ها انتخاب شود",
      ],
    ];

    // ایجاد و تنظیم ورک‌شیت اصلی
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // ایجاد ورک‌شیت استان‌ها
    const provincesData = [
      ["شناسه استان", "نام استان", "کد استان"],
      ...provinces.map((province) => [
        province._id.toString(),
        province.name,
        province.code,
      ]),
    ];

    const provincesWorksheet = XLSX.utils.aoa_to_sheet(provincesData);

    // تنظیم عرض ستون‌ها
    const cols = [
      { wch: 25 }, // نام منطقه
      { wch: 15 }, // کد منطقه
      { wch: 30 }, // شناسه استان
    ];

    const provincesCols = [
      { wch: 30 }, // شناسه استان
      { wch: 25 }, // نام استان
      { wch: 15 }, // کد استان
    ];

    worksheet["!cols"] = cols;
    provincesWorksheet["!cols"] = provincesCols;

    // اضافه کردن ورک‌شیت‌ها به کتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, "مناطق");
    XLSX.utils.book_append_sheet(workbook, provincesWorksheet, "استان‌ها");

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ایجاد پاسخ با فایل اکسل
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_districts.xlsx"',
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, message: "خطا در تولید فایل نمونه: " + error.message },
      { status: 500 }
    );
  }
}
