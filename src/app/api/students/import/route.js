import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import District from "@/models/District";
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

    // دریافت کد استان از روی منطقه
    let provinceCode = "";
    if (user.examCenter.district?._id) {
      const district = await District.findById(
        user.examCenter.district._id
      ).populate("province");
      provinceCode = district?.province?.code || "";
    } else if (user.district?._id) {
      const district = await District.findById(user.district._id).populate(
        "province"
      );
      provinceCode = district?.province?.code || "";
    }

    // دریافت سال تحصیلی از URL
    const { searchParams } = new URL(request.url);
    const yearFilter = searchParams.get("yearFilter") || "current"; // "current" or "previous"

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

    let targetAcademicYear = activeAcademicYear;
    if (yearFilter === "previous") {
      // دریافت سال تحصیلی قبلی
      targetAcademicYear = await AcademicYear.findOne({
        name: { $lt: activeAcademicYear.name },
      }).sort({ name: -1 });

      if (!targetAcademicYear) {
        return NextResponse.json(
          { error: "سال تحصیلی قبلی یافت نشد" },
          { status: 400 }
        );
      }
    }

    // خواندن فایل از درخواست
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // تبدیل فایل به بافر و خواندن اکسل
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // بررسی وجود شیت اول
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json(
          { error: "فایل اکسل معتبر نیست" },
          { status: 400 }
        );
      }

      // خواندن داده‌های شیت اول
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // بررسی وجود داده
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "فایل اکسل خالی است یا داده‌ای ندارد" },
          { status: 400 }
        );
      }

      // جنسیت‌های معتبر
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

          // تبدیل جنسیت به فرمت استاندارد
          let gender = genderInput;
          if (genderInput === "پسر") gender = "male";
          if (genderInput === "دختر") gender = "female";

          if (!validGenders.includes(gender)) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "جنسیت باید یکی از مقادیر male/female یا پسر/دختر باشد",
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

          // بررسی تکراری نبودن کد ملی در سال تحصیلی مورد نظر
          const existingStudent = await Student.findOne({
            nationalId,
            academicYear: targetAcademicYear._id,
          });

          if (existingStudent) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "این دانش‌آموز قبلاً در این سال تحصیلی ثبت شده است",
            });
            results.errorCount++;
            continue;
          }

          // ایجاد دانش‌آموز جدید
          const newStudent = new Student({
            nationalId,
            firstName,
            lastName,
            fatherName,
            birthDate,
            gender,
            studentType: studentType || "normal",
            nationality: nationality || "IR",
            mobile,
            address,
            gradeCode,
            gradeName: gradeTitle,
            fieldCode: field.fieldCode,
            fieldName: field.fieldName,
            description,
            // اطلاعات سال تحصیلی و دوره تحصیلی - ذخیره عناوین به جای شناسه‌ها
            academicYear: targetAcademicYear.name,
            academicCourse: user.examCenter.course.courseName,
            // اطلاعات واحد سازمانی
            examCenter: user.examCenter._id,
            organizationalUnitCode: user.examCenter.code,
            district: user.examCenter.district._id,
            districtCode: user.examCenter.district.code,
            province: provinceCode,
            createdBy: user._id,
            isActive: true,
          });

          // لاگ اطلاعات برای دیباگ
          console.log("Creating student with data:", {
            nationalId,
            organizationalUnitCode: user.examCenter.code,
            districtCode: user.examCenter.district.code,
            academicYear: targetAcademicYear.name,
            academicCourse: user.examCenter.course.courseName,
          });

          await newStudent.save();
          results.successCount++;
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          results.errorCount++;
          results.errors.push({
            row: rowNumber,
            nationalId: row["کد ملی"] || "-",
            message: error.message || "خطا در پردازش رکورد",
          });
        }
      }

      return NextResponse.json(results);
    } catch (error) {
      console.error("Error reading or parsing Excel file:", error);
      return NextResponse.json(
        { error: "خطا در خواندن یا پردازش فایل اکسل" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error importing students:", error);
    return NextResponse.json(
      { error: error.message || "خطا در پردازش فایل" },
      { status: 500 }
    );
  }
}
