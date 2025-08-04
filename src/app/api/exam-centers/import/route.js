import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import mongoose from "mongoose";

import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Gender from "@/models/Gender";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import OrganizationalUnitType from "@/models/OrganizationalUnitType";
import connectDB from "@/lib/db";

export async function POST(request) {
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

    // خواندن فایل از درخواست
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // خواندن فایل اکسل
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // بررسی وجود شیت اول
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { success: false, message: "فایل اکسل معتبر نیست" },
        { status: 400 }
      );
    }

    // خواندن داده‌های شیت اول
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // بررسی وجود سربرگ‌ها (ردیف اول)
    if (data.length < 2) {
      return NextResponse.json(
        { success: false, message: "فایل اکسل خالی است یا داده‌ای ندارد" },
        { status: 400 }
      );
    }

    // حذف سربرگ (ردیف اول)
    data.shift();

    // آماده‌سازی متغیرهای پردازش
    let success = 0;
    let failed = 0;
    const errors = [];
    const total = data.length;

    // پردازش هر ردیف داده
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      // رد کردن ردیف‌های خالی یا ردیف راهنما
      if (!row || row.length === 0 || !row[0] || row[0] === "راهنما:") {
        continue;
      }

      try {
        // استخراج داده‌های هر ردیف
        const name = row[0]?.toString().trim();
        const code = row[1]?.toString().trim();
        const districtId = row[2]?.toString().trim();
        const capacity = row[3]
          ? parseInt(row[3].toString().trim(), 10)
          : undefined;
        const address = row[4]?.toString().trim();
        const phone = row[5]?.toString().trim();
        const genderCode = row[6]?.toString().trim();
        const courseCode = row[7]?.toString().trim();
        const branchCode = row[8]?.toString().trim();
        const studentCount = row[9]
          ? parseInt(row[9].toString().trim(), 10)
          : undefined;
        const organizationTypeCode = row[10]?.toString().trim();
        const geographicalLocation = row[11]?.toString().trim();

        // بررسی مقادیر الزامی
        if (!name) {
          throw new Error("نام واحد سازمانی الزامی است");
        }

        if (!code) {
          throw new Error("کد واحد سازمانی الزامی است");
        }

        if (!districtId) {
          throw new Error("شناسه منطقه الزامی است");
        }

        // بررسی اگر ظرفیت وارد شده عدد صحیح است
        if (capacity !== undefined && isNaN(capacity)) {
          throw new Error("ظرفیت واحد سازمانی باید عدد صحیح باشد");
        }

        // بررسی اگر تعداد دانش آموز وارد شده عدد صحیح است
        if (studentCount !== undefined && isNaN(studentCount)) {
          throw new Error("تعداد دانش آموز باید عدد صحیح باشد");
        }

        // بررسی موقعیت جغرافیایی
        if (!geographicalLocation) {
          throw new Error("موقعیت جغرافیایی الزامی است");
        }

        const validLocations = ["شهری", "روستایی", "خارج کشور"];
        if (!validLocations.includes(geographicalLocation)) {
          throw new Error(
            "موقعیت جغرافیایی باید یکی از مقادیر شهری، روستایی یا خارج کشور باشد"
          );
        }

        // تبدیل کدها به ObjectId
        let genderId = undefined;
        let courseId = undefined;
        let branchId = undefined;
        let organizationTypeId = undefined;

        // اعتبارسنجی و دریافت جنسیت
        if (genderCode) {
          const gender = await Gender.findOne({ genderCode, isActive: true });
          if (!gender) {
            throw new Error(`جنسیت با کد '${genderCode}' یافت نشد`);
          }
          genderId = gender._id;
        }

        // اعتبارسنجی و دریافت دوره
        if (courseCode) {
          const course = await CourseGrade.findOne({
            courseCode,
            isActive: true,
          });
          if (!course) {
            throw new Error(`دوره با کد '${courseCode}' یافت نشد`);
          }
          courseId = course._id;
        }

        // اعتبارسنجی و دریافت شاخه
        if (branchCode) {
          const branch = await CourseBranchField.findOne({
            branchCode,
            isActive: true,
          });
          if (!branch) {
            throw new Error(`شاخه با کد '${branchCode}' یافت نشد`);
          }
          branchId = branch._id;
        }

        // اعتبارسنجی و دریافت نوع سازمان
        if (organizationTypeCode) {
          const organizationType = await OrganizationalUnitType.findOne({
            unitTypeCode: organizationTypeCode,
            isActive: true,
          });
          if (!organizationType) {
            throw new Error(
              `نوع واحد سازمانی با کد '${organizationTypeCode}' یافت نشد`
            );
          }
          organizationTypeId = organizationType._id;
        }

        // بررسی تکراری نبودن کد واحد سازمانی
        const existingCenterByCode = await ExamCenter.findOne({ code });
        if (existingCenterByCode) {
          throw new Error(`کد واحد سازمانی '${code}' قبلاً ثبت شده است`);
        }

        // بررسی وجود منطقه
        const district = await District.findById(districtId).populate(
          "province"
        );
        if (!district) {
          throw new Error(`منطقه با شناسه '${districtId}' یافت نشد`);
        }

        // ایجاد واحد سازمانی جدید
        const newExamCenter = new ExamCenter({
          name,
          code,
          district: districtId,
          capacity: capacity || 0,
          address: address || undefined,
          phone: phone || undefined,
          gender: genderId || undefined,
          course: courseId || undefined,
          branch: branchId || undefined,
          studentCount: studentCount || undefined,
          organizationType: organizationTypeId || undefined,
          geographicalLocation: geographicalLocation,
          createdBy: user.id,
          isActive: true,
        });

        await newExamCenter.save();
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: rowIndex + 2, // +2 برای نمایش شماره ردیف به صورت انسانی (با احتساب سربرگ و اندیس از ۰)
          name: row[0]?.toString().trim() || "-",
          message: error.message,
        });
      }
    }

    // برگرداندن نتیجه پردازش
    return NextResponse.json({
      success: true,
      message: "پردازش فایل با موفقیت انجام شد",
      total,
      success,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Error processing Excel file:", error);
    return NextResponse.json(
      { success: false, message: "خطا در پردازش فایل: " + error.message },
      { status: 500 }
    );
  }
}
