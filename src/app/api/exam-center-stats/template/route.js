import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";

export async function GET(request) {
  try {
    // بررسی احراز هویت
    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط مدیر سیستم
    if (userValid.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    // دریافت لیست واحدهای سازمانی و سال‌های تحصیلی
    const [examCenters, academicYears] = await Promise.all([
      ExamCenter.find({ isActive: true })
        .select("code name")
        .sort({ code: 1 })
        .lean(),
      AcademicYear.find({}).select("name isActive").sort({ name: -1 }).lean(),
    ]);

    // ایجاد ورکبوک
    const workbook = XLSX.utils.book_new();

    // ایجاد شیت راهنما
    const guideData = [
      ["راهنمای تکمیل فایل:"],
      ["1. تمامی فیلدها اجباری هستند"],
      ["2. کد واحد سازمانی باید از لیست زیر انتخاب شود"],
      ["3. سال تحصیلی باید از لیست زیر انتخاب شود"],
      [
        "4. کد دوره تحصیلی: 100=پیش دبستانی، 200=ابتدایی، 300=متوسطه اول، 400=متوسطه دوم، 500=سایر",
      ],
      ["5. کد شاخه: بر اساس دوره تحصیلی انتخاب شده"],
      ["6. تمامی اعداد باید مثبت باشند"],
      ["7. مجموع دانش‌آموزان دختر و پسر باید برابر با کل دانش‌آموزان باشد"],
      [
        "8. تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد",
      ],
      [""],
      ["لیست واحدهای سازمانی:"],
      ["کد", "نام"],
      ...examCenters.map((center) => [center.code, center.name]),
      [""],
      ["لیست سال‌های تحصیلی:"],
      ["سال تحصیلی", "وضعیت"],
      ...academicYears.map((year) => [
        year.name,
        year.isActive ? "فعال" : "غیرفعال",
      ]),
      [""],
      ["لیست دوره‌های تحصیلی:"],
      ["کد", "نام"],
      ["100", "پیش دبستانی"],
      ["200", "ابتدایی"],
      ["300", "متوسطه اول"],
      ["400", "متوسطه دوم"],
      ["500", "سایر"],
      [""],
      ["نمونه شاخه‌ها (بر اساس دوره):"],
      ["کد دوره", "کد شاخه", "نام شاخه"],
      ["200", "01", "عمومی"],
      ["300", "01", "عمومی"],
      ["400", "01", "ریاضی فیزیک"],
      ["400", "02", "علوم تجربی"],
      ["400", "03", "علوم انسانی"],
    ];

    const guideSheet = XLSX.utils.aoa_to_sheet(guideData);
    XLSX.utils.book_append_sheet(workbook, guideSheet, "راهنما");

    // ایجاد شیت نمونه
    const sampleData = [
      [
        "کد واحد سازمانی",
        "کد استان",
        "کد منطقه",
        "سال تحصیلی",
        "کد دوره",
        "کد شاخه",
        "تعداد کل دانش‌آموزان",
        "تعداد کلاس‌بندی شده",
        "تعداد کلاس‌ها",
        "تعداد دختر",
        "تعداد پسر",
      ],
      [
        examCenters[0]?.code || "",
        "01", // نمونه کد استان
        "0101", // نمونه کد منطقه
        academicYears[0]?.name || "",
        "200", // نمونه کد دوره (ابتدایی)
        "01", // نمونه کد شاخه
        "120",
        "115",
        "6",
        "60",
        "60",
      ],
    ];

    const sampleSheet = XLSX.utils.aoa_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(workbook, sampleSheet, "نمونه");

    // ایجاد شیت اصلی
    const mainData = [
      [
        "کد واحد سازمانی",
        "کد استان",
        "کد منطقه",
        "سال تحصیلی",
        "کد دوره",
        "تعداد کل دانش‌آموزان",
        "تعداد کلاس‌بندی شده",
        "تعداد کلاس‌ها",
        "تعداد دختر",
        "تعداد پسر",
      ],
    ];

    const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, "آمار");

    // تنظیم عرض ستون‌ها
    const setCellWidths = (ws) => {
      const widths = [
        { wch: 15 }, // کد واحد سازمانی
        { wch: 12 }, // کد استان
        { wch: 12 }, // کد منطقه
        { wch: 12 }, // سال تحصیلی
        { wch: 10 }, // کد دوره
        { wch: 20 }, // تعداد کل دانش‌آموزان
        { wch: 18 }, // تعداد کلاس‌بندی شده
        { wch: 15 }, // تعداد کلاس‌ها
        { wch: 12 }, // تعداد دختر
        { wch: 12 }, // تعداد پسر
      ];
      ws["!cols"] = widths;
    };

    setCellWidths(mainSheet);
    setCellWidths(sampleSheet);

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // ارسال فایل
    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=exam-center-stats-template.xlsx",
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد قالب" },
      { status: 500 }
    );
  }
}
