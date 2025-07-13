import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import Province from "@/models/Province";
import District from "@/models/District";
import mongoose from "mongoose";

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

    // لیست دوره‌های تحصیلی معتبر
    const validCourses = {
      100: "پیش دبستانی",
      200: "ابتدایی",
      300: "متوسطه اول",
      400: "متوسطه دوم",
      500: "سایر",
    };

    const results = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // شماره ردیف در اکسل (شروع از 2)

      try {
        // استخراج داده‌ها از ردیف
        const organizationalUnitCode = row["کد واحد سازمانی"]
          ?.toString()
          .trim();
        const academicYear = row["سال تحصیلی"]?.toString().trim();
        const courseCode = row["کد دوره"]?.toString().trim();
        const totalStudents = parseInt(row["تعداد کل دانش‌آموزان"]) || 0;
        const classifiedStudents = parseInt(row["تعداد کلاس‌بندی شده"]) || 0;
        const totalClasses = parseInt(row["تعداد کلاس‌ها"]) || 0;
        const femaleStudents = parseInt(row["تعداد دانش‌آموزان دختر"]) || 0;
        const maleStudents = parseInt(row["تعداد دانش‌آموزان پسر"]) || 0;
        const provinceCode = row["کد استان"]?.toString().trim();
        const districtCode = row["کد منطقه"]?.toString().trim();
        const branchCode = row["کد شاخه"]?.toString().trim();

        // اعتبارسنجی فیلدهای الزامی
        if (!organizationalUnitCode) {
          errors.push(`ردیف ${rowNumber}: کد واحد سازمانی الزامی است`);
          continue;
        }

        if (!academicYear) {
          errors.push(`ردیف ${rowNumber}: سال تحصیلی الزامی است`);
          continue;
        }

        if (!courseCode) {
          errors.push(`ردیف ${rowNumber}: کد دوره تحصیلی الزامی است`);
          continue;
        }

        if (!branchCode) {
          errors.push(`ردیف ${rowNumber}: کد شاخه الزامی است`);
          continue;
        }

        if (!validCourses[courseCode]) {
          errors.push(
            `ردیف ${rowNumber}: کد دوره تحصیلی معتبر نیست. کدهای معتبر: 100, 200, 300, 400, 500`
          );
          continue;
        }

        const courseName = validCourses[courseCode];

        // بررسی وجود شاخه برای دوره انتخاب شده
        const CourseBranchField = mongoose.model("CourseBranchField");
        const branch = await CourseBranchField.findOne({
          courseCode: courseCode,
          branchCode: branchCode,
          isActive: true,
        });

        if (!branch) {
          errors.push(
            `ردیف ${rowNumber}: کد شاخه ${branchCode} برای دوره ${courseCode} معتبر نیست`
          );
          continue;
        }

        const branchTitle = branch.branchTitle;

        // بررسی وجود واحد سازمانی
        const examCenter = await ExamCenter.findOne({
          code: organizationalUnitCode,
        }).populate({
          path: "district",
          populate: { path: "province" },
        });

        if (!examCenter) {
          errors.push(
            `ردیف ${rowNumber}: واحد سازمانی با کد ${organizationalUnitCode} یافت نشد`
          );
          continue;
        }

        // بررسی وجود سال تحصیلی
        const academicYearExists = await AcademicYear.findOne({
          name: academicYear,
        });

        if (!academicYearExists) {
          errors.push(
            `ردیف ${rowNumber}: سال تحصیلی ${academicYear} معتبر نیست`
          );
          continue;
        }
         // اعتبارسنجی منطقی داده‌ها
        if (Number(classifiedStudents) > Number(totalStudents)) {
          errors.push(
            `ردیف ${rowNumber}: تعداد کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد`
          );
          continue;
        }

        console.log("femaleStudents-------->", femaleStudents);
        console.log("maleStudents-------->", maleStudents);
        console.log("totalStudents-------->", totalStudents); 
        if (
          Number(femaleStudents) + Number(maleStudents) !==
          Number(totalStudents)
        ) {
          errors.push(
            `ردیف ${rowNumber}: مجموع دانش‌آموزان دختر و پسر باید برابر کل دانش‌آموزان باشد`
          );
          continue;
        }

        // بررسی تکراری نبودن
        const existingStats = await ExamCenterStats.findOne({
          organizationalUnitCode,
          academicYear,
          courseCode,
        });

        if (existingStats) {
          // بروزرسانی آمار موجود
          existingStats.courseName = courseName;
          existingStats.totalStudents = totalStudents;
          existingStats.classifiedStudents = classifiedStudents;
          existingStats.totalClasses = totalClasses;
          existingStats.femaleStudents = femaleStudents;
          existingStats.maleStudents = maleStudents;
          existingStats.provinceCode =
            provinceCode || examCenter.district.province.code;
          existingStats.districtCode = districtCode || examCenter.district.code;
          existingStats.updatedBy = userValid.id;

          await existingStats.save();
          results.push({
            row: rowNumber,
            action: "updated",
            organizationalUnitCode,
            academicYear,
            courseCode,
            courseName,
          });
        } else {
          // ایجاد آمار جدید
          const newStats = new ExamCenterStats({
            organizationalUnitCode,
            academicYear,
            courseCode,
            courseName,
            branchCode,
            branchTitle,
            totalStudents,
            classifiedStudents,
            totalClasses,
            femaleStudents,
            maleStudents,
            provinceCode: provinceCode || examCenter.district.province.code,
            districtCode: districtCode || examCenter.district.code,
            createdBy: userValid.id,
          });

          await newStats.save();
          results.push({
            row: rowNumber,
            action: "created",
            organizationalUnitCode,
            academicYear,
            courseCode,
            courseName,
          });
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push(`ردیف ${rowNumber}: خطا در پردازش - ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `پردازش کامل شد. ${results.length} ردیف موفق، ${errors.length} خطا`,
      data: {
        processed: results.length,
        errorCount: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error("Error importing exam center stats:", error);
    return NextResponse.json(
      { success: false, error: "خطا در بارگذاری فایل" },
      { status: 500 }
    );
  }
}
