import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import User from "@/models/User";
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

    // تعریف نقش‌های معتبر
    const validRoles = [
      "systemAdmin",
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "districtEducationExpert",
      "districtTechExpert",
      "examCenterManager",
    ];

    // پردازش هر ردیف داده
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      // رد کردن ردیف‌های خالی
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }

      try {
        // استخراج داده‌های هر ردیف
        const fullName = row[0]?.toString().trim();
        const nationalId = row[1]?.toString().trim();
        const password = row[2]?.toString().trim();
        const role = row[3]?.toString().trim();
        const province = row[4]?.toString().trim();
        const district = row[5]?.toString().trim();
        const examCenter = row[6]?.toString().trim();

        // بررسی مقادیر الزامی
        if (!fullName) {
          throw new Error("نام و نام خانوادگی الزامی است");
        }

        if (!nationalId) {
          throw new Error("کد ملی الزامی است");
        }

        if (nationalId.length !== 10 || !/^\d+$/.test(nationalId)) {
          throw new Error("کد ملی باید ۱۰ رقم باشد");
        }

        if (!password || password.length < 6) {
          throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد");
        }

        if (!role || !validRoles.includes(role)) {
          throw new Error("نقش کاربر معتبر نیست");
        }

        // بررسی فیلدهای وابسته به نقش
        const requiresProvince = [
          "generalManager",
          "provinceEducationExpert",
          "provinceTechExpert",
          "districtEducationExpert",
          "districtTechExpert",
          "examCenterManager",
        ];

        const requiresDistrict = [
          "districtEducationExpert",
          "districtTechExpert",
          "examCenterManager",
        ];

        const requiresExamCenter = ["examCenterManager"];

        if (requiresProvince.includes(role) && !province) {
          throw new Error("شناسه استان برای این نقش الزامی است");
        }

        if (requiresDistrict.includes(role) && !district) {
          throw new Error("شناسه منطقه برای این نقش الزامی است");
        }

        if (requiresExamCenter.includes(role) && !examCenter) {
          throw new Error("شناسه مرکز آزمون برای این نقش الزامی است");
        }

        // بررسی تکراری نبودن کد ملی
        const existingUser = await User.findOne({ nationalId });
        if (existingUser) {
          throw new Error("کد ملی قبلاً ثبت شده است");
        }

        // هش کردن رمز عبور
        const hashedPassword = await bcrypt.hash(password, 10);

        // ایجاد کاربر جدید
        const newUser = new User({
          fullName,
          nationalId,
          password: hashedPassword,
          role,
          province: province ? province : undefined,
          district: district ? district : undefined,
          examCenter: examCenter ? examCenter : undefined,
          isActive: true,
        });

        await newUser.save();
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: rowIndex + 2, // +2 برای نمایش شماره ردیف به صورت انسانی (با احتساب سربرگ و اندیس از ۰)
          nationalId: row[1]?.toString().trim() || "-",
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
