import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";
import * as XLSX from "xlsx";

// GET - دانلود فایل نمونه Excel برای دانش‌آموزان
export async function GET(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id).populate({
      path: "examCenter",
      populate: [{ path: "course" }, { path: "branch" }],
    });

    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json(
        { error: "شما دسترسی لازم را ندارید" },
        { status: 403 }
      );
    }

    // دریافت اطلاعات کمکی مربوط به واحد سازمانی کاربر
    const [grades, fields] = await Promise.all([
      CourseGrade.find({
        courseCode: user.examCenter.course?.courseCode,
        isActive: true,
      })
        .select("gradeCode gradeName courseCode courseName")
        .lean(),
      CourseBranchField.find({
        courseCode: user.examCenter.course?.courseCode,
        branchCode: user.examCenter.branch?.branchCode,
        isActive: true,
      })
        .select("fieldCode fieldTitle courseCode courseTitle")
        .lean(),
    ]);

    // ایجاد داده‌های Excel
    const headers = [
      "کد ملی",
      "نام",
      "نام خانوادگی",
      "نام پدر",
      "تاریخ تولد (فارسی)",
      "پایه",
      "کد رشته",
      "رشته",
      "نوع (normal/adult)",
      "جنسیت",
      "ملیت",
      "موبایل",
      "آدرس",
    ];

    // ردیف نمونه
    const sampleRow = [
      "1234567890",
      "احمد",
      "احمدی",
      "علی",
      "1385/05/15",
      grades[0]?.gradeName || "ششم ابتدایی",
      fields[0]?.fieldCode || "1",
      fields[0]?.fieldTitle || "عمومی",
      "normal",
      "male",
      "ایرانی",
      "09123456789",
      "تهران، خیابان آزادی",
    ];

    // ایجاد worksheet اصلی
    const worksheetData = [headers, sampleRow];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // ایجاد worksheet راهنما
    const guideData = [
      ["راهنمای تکمیل فایل دانش‌آموزان"],
      [],
      ["عناوین پایه‌های موجود:"],
    ];

    grades.forEach((grade) => {
      guideData.push([`${grade.gradeName}`]);
    });

    guideData.push([]);
    guideData.push(["کدهای رشته‌های موجود:"]);
    fields.forEach((field) => {
      guideData.push([`${field.fieldCode}: ${field.fieldTitle}`]);
    });

    guideData.push([]);
    guideData.push(["جنسیت‌های مجاز:"]);
    guideData.push(["male: پسر"]);
    guideData.push(["female: دختر"]);

    guideData.push([]);
    guideData.push(["نوع دانش‌آموز:"]);
    guideData.push(["normal یا عادی: دانش‌آموز عادی"]);
    guideData.push(["adult یا بزرگسال: دانش‌آموز بزرگسال"]);

    guideData.push([]);
    guideData.push(["نکات مهم:"]);
    guideData.push(["- کد ملی باید 10 رقم باشد"]);
    guideData.push(["- تاریخ تولد به صورت فارسی (1385/05/15)"]);
    guideData.push(["- عنوان پایه باید دقیقاً مطابق لیست بالا باشد"]);
    guideData.push([
      "- اگر عنوان پایه موجود نباشد، با کد 501 (سایر) ثبت می‌شود",
    ]);
    guideData.push(["- کد رشته باید دقیقاً مطابق لیست بالا باشد"]);
    guideData.push(["- اگر کد رشته موجود نباشد، رکورد ثبت نمی‌شود"]);
    guideData.push(["- حداکثر 500 رکورد در هر بار"]);
    guideData.push(["- کد ملی نباید تکراری باشد"]);

    const guideWorksheet = XLSX.utils.aoa_to_sheet(guideData);

    // ایجاد workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "دانش‌آموزان");
    XLSX.utils.book_append_sheet(workbook, guideWorksheet, "راهنما");

    // تبدیل به buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="students-template.xlsx"',
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد فایل نمونه" },
      { status: 500 }
    );
  }
}
