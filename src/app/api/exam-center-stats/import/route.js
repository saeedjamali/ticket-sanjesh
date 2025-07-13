import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";

export async function POST(request) {
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // تبدیل فایل به بافر
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // بررسی ساختار فایل
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, message: "فایل خالی است" },
        { status: 400 }
      );
    }

    const requiredColumns = [
      "کد واحد سازمانی",
      "سال تحصیلی",
      "تعداد کل دانش‌آموزان",
      "تعداد دانش‌آموزان کلاس‌بندی شده",
      "تعداد کلاس‌ها",
      "تعداد دانش‌آموزان دختر",
      "تعداد دانش‌آموزان پسر",
    ];

    const missingColumns = requiredColumns.filter(
      (col) => !Object.keys(data[0]).includes(col)
    );

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `ستون‌های زیر در فایل یافت نشد: ${missingColumns.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // دریافت لیست واحدهای سازمانی و سال‌های تحصیلی موجود
    const examCenterCodes = [
      ...new Set(data.map((row) => row["کد واحد سازمانی"])),
    ];
    const academicYears = [...new Set(data.map((row) => row["سال تحصیلی"]))];

    const [examCenters, years] = await Promise.all([
      ExamCenter.find({ code: { $in: examCenterCodes } })
        .select("code")
        .lean(),
      AcademicYear.find({ name: { $in: academicYears } })
        .select("name")
        .lean(),
    ]);

    const validExamCenterCodes = examCenters.map((ec) => ec.code);
    const validAcademicYears = years.map((y) => y.name);

    const results = {
      success: [],
      errors: [],
    };

    // پردازش و ذخیره داده‌ها
    for (const [index, row] of data.entries()) {
      try {
        const organizationalUnitCode = row["کد واحد سازمانی"].toString();
        const academicYear = row["سال تحصیلی"].toString();

        // بررسی اعتبار داده‌ها
        if (!validExamCenterCodes.includes(organizationalUnitCode)) {
          results.errors.push({
            row: index + 2,
            message: `کد واحد سازمانی ${organizationalUnitCode} معتبر نیست`,
          });
          continue;
        }

        if (!validAcademicYears.includes(academicYear)) {
          results.errors.push({
            row: index + 2,
            message: `سال تحصیلی ${academicYear} معتبر نیست`,
          });
          continue;
        }

        const totalStudents = parseInt(row["تعداد کل دانش‌آموزان"]);
        const classifiedStudents = parseInt(
          row["تعداد دانش‌آموزان کلاس‌بندی شده"]
        );
        const totalClasses = parseInt(row["تعداد کلاس‌ها"]);
        const femaleStudents = parseInt(row["تعداد دانش‌آموزان دختر"]);
        const maleStudents = parseInt(row["تعداد دانش‌آموزان پسر"]);

        // بررسی اعتبار اعداد
        if (
          isNaN(totalStudents) ||
          isNaN(classifiedStudents) ||
          isNaN(totalClasses) ||
          isNaN(femaleStudents) ||
          isNaN(maleStudents)
        ) {
          results.errors.push({
            row: index + 2,
            message: "مقادیر عددی نامعتبر هستند",
          });
          continue;
        }

        // بررسی منطقی بودن داده‌ها
        if (classifiedStudents > totalStudents) {
          results.errors.push({
            row: index + 2,
            message:
              "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد",
          });
          continue;
        }

        if (femaleStudents + maleStudents !== totalStudents) {
          results.errors.push({
            row: index + 2,
            message:
              "مجموع دانش‌آموزان دختر و پسر باید برابر با کل دانش‌آموزان باشد",
          });
          continue;
        }

        // ذخیره آمار
        await ExamCenterStats.upsertStats(
          {
            organizationalUnitCode,
            academicYear,
            totalStudents,
            classifiedStudents,
            totalClasses,
            femaleStudents,
            maleStudents,
          },
          userValid.id
        );

        results.success.push({
          row: index + 2,
          organizationalUnitCode,
          academicYear,
        });
      } catch (error) {
        results.errors.push({
          row: index + 2,
          message: error.message || "خطای ناشناخته",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "پردازش فایل با موفقیت انجام شد",
      data: {
        totalRows: data.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
        successItems: results.success,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error("Error importing exam center stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "خطا در بارگذاری فایل",
      },
      { status: 500 }
    );
  }
}
