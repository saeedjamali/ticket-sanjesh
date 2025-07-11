import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";

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

    const user = await User.findById(userValid.id).populate("examCenter");

    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const grade = searchParams.get("gradeCode") || "";
    const field = searchParams.get("fieldCode") || "";
    const academicYear = searchParams.get("academicYear") || "";

    // ساخت فیلتر
    const filter = {
      organizationalUnitCode: user.examCenter.code,
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }

    if (grade) {
      filter.gradeCode = grade;
    }

    if (field) {
      filter.fieldCode = field;
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    // دریافت تمام دانش‌آموزان بدون محدودیت صفحه‌بندی
    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();

    if (students.length === 0) {
      return NextResponse.json(
        { error: "هیچ دانش‌آموزی برای صادرات یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت نام‌های پایه و رشته
    const gradeCodes = [...new Set(students.map((s) => s.gradeCode))];
    const fieldCodes = [...new Set(students.map((s) => s.fieldCode))];

    const [grades, fields] = await Promise.all([
      CourseGrade.find({ gradeCode: { $in: gradeCodes } })
        .select("gradeCode gradeName")
        .lean(),
      CourseBranchField.find({ fieldCode: { $in: fieldCodes } })
        .select("fieldCode fieldTitle")
        .lean(),
    ]);

    // ایجاد نقشه برای جستجوی سریع
    const gradeMap = grades.reduce((acc, grade) => {
      acc[grade.gradeCode] = grade.gradeName;
      return acc;
    }, {});

    const fieldMap = fields.reduce((acc, field) => {
      acc[field.fieldCode] = field.fieldTitle;
      return acc;
    }, {});

    // تبدیل داده‌ها برای Excel
    const excelData = students.map((student, index) => ({
      ردیف: index + 1,
      "کد ملی": student.nationalId,
      نام: student.firstName,
      "نام خانوادگی": student.lastName,
      "نام پدر": student.fatherName,
      "تاریخ تولد": student.birthDate,
      جنسیت: student.gender === "male" ? "پسر" : "دختر",
      ملیت: student.nationality || "ایرانی",
      "شماره موبایل": student.mobile || "",
      آدرس: student.address || "",
      "پایه تحصیلی": gradeMap[student.gradeCode] || student.gradeCode,
      "کد پایه": student.gradeCode,
      "رشته تحصیلی": fieldMap[student.fieldCode] || student.fieldCode,
      "کد رشته": student.fieldCode,
      "نوع دانش‌آموز": student.studentType === "normal" ? "عادی" : "بزرگسال",
      "سال تحصیلی": student.academicYear,
      "تاریخ ثبت": new Date(student.createdAt).toLocaleDateString("fa-IR"),
    }));

    // ایجاد Workbook و Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 8 }, // ردیف
      { wch: 12 }, // کد ملی
      { wch: 15 }, // نام
      { wch: 15 }, // نام خانوادگی
      { wch: 15 }, // نام پدر
      { wch: 12 }, // تاریخ تولد
      { wch: 8 }, // جنسیت
      { wch: 10 }, // ملیت
      { wch: 15 }, // موبایل
      { wch: 25 }, // آدرس
      { wch: 20 }, // پایه تحصیلی
      { wch: 10 }, // کد پایه
      { wch: 20 }, // رشته تحصیلی
      { wch: 10 }, // کد رشته
      { wch: 12 }, // نوع دانش‌آموز
      { wch: 12 }, // سال تحصیلی
      { wch: 12 }, // تاریخ ثبت
    ];
    ws["!cols"] = columnWidths;

    // اضافه کردن Worksheet به Workbook
    XLSX.utils.book_append_sheet(wb, ws, "دانش‌آموزان");

    // تولید Buffer فایل Excel
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // تولید نام فایل با تاریخ و زمان
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `students-${timestamp}.xlsx`;

    // بازگرداندن فایل
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting students:", error);
    return NextResponse.json(
      { error: "خطا در صادرات فایل Excel" },
      { status: 500 }
    );
  }
}
