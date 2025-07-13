import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ExamCenterStats from "@/models/ExamCenterStats";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(request, { params }) {
  try {
    // بررسی احراز هویت
    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - مدیر سیستم و مدیر کل
    if (
      userValid.role !== ROLES.SYSTEM_ADMIN &&
      userValid.role !== ROLES.GENERAL_MANAGER
    ) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { code, year } = await params;

    // یافتن آمار واحد سازمانی
    const stats = await ExamCenterStats.findOne({
      organizationalUnitCode: code,
      academicYear: year,
    }).lean();

    if (!stats) {
      return NextResponse.json(
        { success: false, message: "آمار یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching exam center stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // بررسی احراز هویت
    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - مدیر سیستم و مدیر کل
    if (
      userValid.role !== ROLES.SYSTEM_ADMIN &&
      userValid.role !== ROLES.GENERAL_MANAGER
    ) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { code, year } = await params;
    const body = await request.json();

    // یافتن آمار موجود
    const existingStats = await ExamCenterStats.findOne({
      organizationalUnitCode: code,
      academicYear: year,
    });

    if (!existingStats) {
      return NextResponse.json(
        { success: false, message: "آمار یافت نشد" },
        { status: 404 }
      );
    }

    // بروزرسانی آمار
    const updatedStats = await ExamCenterStats.findOneAndUpdate(
      {
        organizationalUnitCode: code,
        academicYear: year,
      },
      {
        ...body,
        organizationalUnitCode: code, // اطمینان از عدم تغییر کد
        academicYear: year, // اطمینان از عدم تغییر سال
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "آمار با موفقیت بروزرسانی شد",
      stats: updatedStats,
    });
  } catch (error) {
    console.error("Error updating exam center stats:", error);

    // بررسی خطاهای اعتبارسنجی
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          message: "خطا در اعتبارسنجی داده‌ها",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // بررسی خطای تکراری
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "آمار برای این واحد سازمانی و سال تحصیلی قبلاً ثبت شده است",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "خطا در بروزرسانی آمار" },
      { status: 500 }
    );
  }
}
