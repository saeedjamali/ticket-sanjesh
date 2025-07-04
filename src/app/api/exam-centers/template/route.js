import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import Province from "@/models/Province";
import District from "@/models/District";
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

    // دریافت مناطق و استان‌ها برای درج در فایل نمونه
    const districts = await District.find()
      .populate("province")
      .select("_id name code province");

    // ایجاد فایل اکسل نمونه
    const workbook = XLSX.utils.book_new();

    // تعریف ستون‌های فایل
    const data = [
      [
        "نام واحد سازمانی",
        "کد واحد سازمانی",
        "شناسه منطقه",
        "ظرفیت",
        "آدرس",
        "تلفن",
        "جنسیت",
        "دوره",
        "تعداد دانش آموز",
        "نوع واحد سازمانی",
      ],
      [
        "واحد سازمانی 1",
        "EC001",
        districts.length > 0
          ? districts[0]._id.toString()
          : "6123456789abcdef12345678",
        "30",
        "آدرس واحد سازمانی 1",
        "021-12345678",
        "مختلط",
        "متوسطه اول",
        "150",
        "دولتی",
      ],
      [
        "واحد سازمانی 2",
        "EC002",
        districts.length > 0
          ? districts[0]._id.toString()
          : "6123456789abcdef12345678",
        "50",
        "آدرس واحد سازمانی 2",
        "021-87654321",
        "دختر",
        "ابتدایی",
        "200",
        "غیردولتی",
      ],
      [
        "راهنما:",
        "کد مرکز باید منحصربفرد باشد",
        "شناسه منطقه باید از لیست مناطق انتخاب شود",
        "عدد صحیح",
        "اختیاری",
        "اختیاری",
        "دختر/پسر/مختلط",
        "ابتدایی/متوسطه اول/متوسطه دوم فنی/متوسطه دوم کاردانش/متوسطه دوم نظری",
        "عدد صحیح",
        "دولتی/غیردولتی",
      ],
    ];

    // ایجاد و تنظیم ورک‌شیت اصلی
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // ایجاد ورک‌شیت مناطق
    const districtsData = [
      ["شناسه منطقه", "نام منطقه", "کد منطقه", "استان"],
      ...districts.map((district) => [
        district._id.toString(),
        district.name,
        district.code,
        district.province?.name || "-",
      ]),
    ];

    const districtsWorksheet = XLSX.utils.aoa_to_sheet(districtsData);

    // تنظیم عرض ستون‌ها
    const cols = [
      { wch: 25 }, // نام واحد سازمانی
      { wch: 15 }, // کد واحد سازمانی
      { wch: 30 }, // شناسه منطقه
      { wch: 10 }, // ظرفیت
      { wch: 30 }, // آدرس
      { wch: 15 }, // تلفن
      { wch: 12 }, // جنسیت
      { wch: 20 }, // دوره
      { wch: 15 }, // تعداد دانش آموز
      { wch: 18 }, // نوع واحد سازمانی
    ];

    const districtsCols = [
      { wch: 30 }, // شناسه منطقه
      { wch: 25 }, // نام منطقه
      { wch: 15 }, // کد منطقه
      { wch: 20 }, // استان
    ];

    worksheet["!cols"] = cols;
    districtsWorksheet["!cols"] = districtsCols;

    // اضافه کردن ورک‌شیت‌ها به کتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, "واحدهای سازمانی");
    XLSX.utils.book_append_sheet(workbook, districtsWorksheet, "مناطق");

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ایجاد پاسخ با فایل اکسل
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_exam_centers.xlsx"',
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
