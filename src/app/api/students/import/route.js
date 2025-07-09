import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";

import { verifyJWT } from "@/lib/auth/tokenService";
import { authService } from "@/lib/auth/authService";

// POST - بارگذاری و پردازش فایل Excel دانش‌آموزان
export async function POST(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id)
      .populate("province")
      .populate("district")
      .populate({
        path: "examCenter",
        populate: [
          { path: "course" },
          { path: "branch" },
          { path: "district" },
        ],
      });

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // لاگ اطلاعات کاربر برای دیباگ
    console.log("User info for import:", {
      userId: user._id,
      role: user.role,
      examCenterId: user.examCenter?._id,
      examCenterCode: user.examCenter?.code,
      examCenterName: user.examCenter?.name,
      districtCode: user.examCenter?.district?.code || user.district?.code,
      courseCode: user.examCenter?.course?.courseCode,
      courseName: user.examCenter?.course?.courseName,
      branchCode: user.examCenter?.branch?.branchCode,
    });

    // بررسی دسترسی - فقط مدیران واحد سازمانی
    if (user.role !== "examCenterManager") {
      return NextResponse.json(
        { error: "شما دسترسی لازم را ندارید" },
        { status: 403 }
      );
    }

    // بررسی اطلاعات لازم واحد سازمانی
    if (!user.examCenter) {
      return NextResponse.json(
        { error: "واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    if (!user.examCenter.code) {
      return NextResponse.json(
        { error: "کد واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    const districtCode = user.examCenter.district?.code || user.district?.code;
    if (!districtCode) {
      return NextResponse.json(
        { error: "کد منطقه برای واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    // دریافت فایل از FormData
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // بررسی نوع فایل
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع فایل نامعتبر است. لطفاً فایل Excel یا CSV استفاده کنید" },
        { status: 400 }
      );
    }

    // خواندن فایل Excel مستقیماً از buffer
    const buffer = await file.arrayBuffer();
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "array" });
    } catch (error) {
      throw new Error(`خطا در خواندن فایل Excel: ${error.message}`);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("فایل Excel شیت معتبری ندارد");
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json({ error: "فایل خالی است" }, { status: 400 });
    }

    if (data.length > 500) {
      return NextResponse.json(
        { error: "حداکثر ۵۰۰ رکورد در هر بار قابل بارگذاری است" },
        { status: 400 }
      );
    }

    // دریافت اطلاعات کمکی
    const [activeAcademicYear, grades, fields] = await Promise.all([
      AcademicYear.findOne({ isActive: true }),
      CourseGrade.find({ isActive: true }).lean(),
      CourseBranchField.find({ isActive: true }).lean(),
    ]);

    if (!activeAcademicYear) {
      return NextResponse.json(
        { error: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    // جنسیت‌های معتبر (hardcode شده)
    const validGenders = ["male", "female", "پسر", "دختر"];

    const results = {
      totalRecords: data.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    // پردازش هر رکورد
    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 2; // شروع از ردیف ۲ (بعد از header)

      try {
        // استخراج داده‌ها
        const nationalId = String(row["کد ملی"] || "").trim();
        const firstName = String(row["نام"] || "").trim();
        const lastName = String(row["نام خانوادگی"] || "").trim();
        const fatherName = String(row["نام پدر"] || "").trim();
        const birthDate = String(row["تاریخ تولد (فارسی)"] || "").trim();
        const gradeTitle = String(row["پایه"] || "").trim();
        const fieldCode = String(row["کد رشته"] || "").trim();
        const fieldTitle = String(row["رشته"] || "").trim();
        const genderInput = String(row["جنسیت"] || "")
          .trim()
          .toLowerCase();
        const studentType = String(
          row["نوع (normal/adult)"] || "normal"
        ).trim();
        const nationality = String(row["ملیت"] || "").trim();
        const mobile = String(row["موبایل"] || "").trim();
        const address = String(row["آدرس"] || "").trim();

        // اعتبارسنجی فیلدهای ضروری
        if (!nationalId) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "کد ملی الزامی است",
          });
          results.errorCount++;
          continue;
        }

        if (!/^\d{10}$/.test(nationalId)) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "کد ملی باید 10 رقم باشد",
          });
          results.errorCount++;
          continue;
        }

        if (!firstName || !lastName || !fatherName || !birthDate) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "نام، نام خانوادگی، نام پدر و تاریخ تولد الزامی است",
          });
          results.errorCount++;
          continue;
        }

        // بررسی پایه براساس عنوان
        let grade = grades.find(
          (g) =>
            g.gradeName === gradeTitle &&
            g.courseCode === user.examCenter.course.courseCode
        );

        let gradeCode;
        let description = "";

        if (!grade) {
          // اگر پایه پیدا نشد، با کد 501 (سایر) ثبت می‌شود
          gradeCode = "501";
          description = `پایه اصلی: ${gradeTitle}`;

          // بررسی وجود پایه با کد 501
          const otherGrade = grades.find(
            (g) =>
              g.gradeCode === "501" &&
              g.courseCode === user.examCenter.course.courseCode
          );

          if (!otherGrade) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: `پایه "${gradeTitle}" یافت نشد و پایه "سایر" (کد 501) در سیستم موجود نیست`,
            });
            results.errorCount++;
            continue;
          }
        } else {
          gradeCode = grade.gradeCode;
        }

        // بررسی رشته براساس کد رشته
        const field = fields.find(
          (f) =>
            f.fieldCode === fieldCode &&
            f.courseCode === user.examCenter.course.courseCode &&
            f.branchCode === user.examCenter.branch.branchCode
        );

        if (!field) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: `کد رشته "${fieldCode}" یافت نشد یا متعلق به دوره و شاخه شما نیست`,
          });
          results.errorCount++;
          continue;
        }

        // تبدیل و بررسی جنسیت
        let gender;
        if (
          genderInput === "پسر" ||
          genderInput === "male" ||
          genderInput === "m"
        ) {
          gender = "male";
        } else if (
          genderInput === "دختر" ||
          genderInput === "female" ||
          genderInput === "f"
        ) {
          gender = "female";
        } else {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: `جنسیت "${genderInput}" نامعتبر است. باید پسر یا دختر باشد`,
          });
          results.errorCount++;
          continue;
        }

        // بررسی نوع دانش‌آموز
        if (!["normal", "adult"].includes(studentType)) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "نوع دانش‌آموز باید normal یا adult باشد",
          });
          results.errorCount++;
          continue;
        }

        // بررسی موبایل
        if (mobile && !/^09\d{9}$/.test(mobile)) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "شماره موبایل نامعتبر است",
          });
          results.errorCount++;
          continue;
        }

        // بررسی تکراری نبودن کد ملی
        const existingStudent = await Student.findOne({
          nationalId,
          academicYear: activeAcademicYear.name,
        });

        if (existingStudent) {
          results.errors.push({
            row: rowNumber,
            nationalId,
            message: "دانش‌آموز با این کد ملی قبلاً ثبت شده است",
          });
          results.errorCount++;
          continue;
        }

        // ایجاد دانش‌آموز
        const studentData = {
          nationalId,
          firstName,
          lastName,
          fatherName,
          birthDate,
          gender,
          academicCourse:
            user.examCenter.course?.courseName || grade?.courseName || "",
          gradeCode,
          fieldCode,
          studentType,
          nationality: nationality || "ایرانی",
          mobile: mobile || "",
          address: address || "",
          description,
          academicYear: activeAcademicYear.name,
          districtCode: districtCode,
          organizationalUnitCode: user.examCenter.code,
          createdBy: user._id,
        };

        // لاگ داده‌های دانش‌آموز قبل از ذخیره
        console.log(`Creating student for row ${rowNumber}:`, {
          nationalId: studentData.nationalId,
          districtCode: studentData.districtCode,
          organizationalUnitCode: studentData.organizationalUnitCode,
          academicCourse: studentData.academicCourse,
          gradeCode: studentData.gradeCode,
          fieldCode: studentData.fieldCode,
        });

        const student = new Student(studentData);
        await student.save();

        results.successCount++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          nationalId: row["کد ملی"] || "",
          message: error.message || "خطای پردازش",
        });
        results.errorCount++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error importing students:", error);
    return NextResponse.json(
      { error: "خطا در بارگذاری فایل" },
      { status: 500 }
    );
  }
}
