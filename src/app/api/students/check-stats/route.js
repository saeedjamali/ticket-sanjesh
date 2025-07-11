import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import ExamCenterStats from "@/models/ExamCenterStats";
import AcademicYear from "@/models/AcademicYear";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    // بررسی احراز هویت
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    console.log("User Info:", {
      role: user.role,
      examCenter: user.examCenter,
      id: user.id,
    });

    // بررسی دسترسی - فقط مدیر واحد سازمانی
    if (user.role !== ROLES.EXAM_CENTER_MANAGER) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    // پیدا کردن واحد سازمانی
    const ExamCenter = mongoose.model("ExamCenter");
    const examCenter = await ExamCenter.findById(user.examCenter);

    if (!examCenter) {
      return NextResponse.json(
        { success: false, message: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت سال تحصیلی فعال
    const activeYear = await AcademicYear.findOne({ isActive: true });
    console.log("Active Year:", activeYear);

    if (!activeYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت سال تحصیلی قبل
    const previousYear = await AcademicYear.findOne({
      name: { $lt: activeYear.name },
    }).sort({ name: -1 });
    console.log("Previous Year:", previousYear);

    if (!previousYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی قبل یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت آمار واحد سازمانی برای سال قبل
    const previousYearStats = await ExamCenterStats.findOne({
      organizationalUnitCode: examCenter.code,
      academicYear: previousYear.name,
    });
    console.log("Previous Year Stats:", previousYearStats);

    if (!previousYearStats) {
      return NextResponse.json(
        {
          success: false,
          message: `آمار واحد سازمانی شما برای سال تحصیلی ${previousYear.name} در سیستم ثبت نشده است. لطفا با مدیر سیستم تماس بگیرید تا ابتدا آمار کل دانش‌آموزان واحد سازمانی شما در سال تحصیلی ${previousYear.name} را در بخش "آمار واحد سازمانی" ثبت نماید.`,
        },
        { status: 404 }
      );
    }

    // شمارش تعداد دانش‌آموزان ثبت شده در سال قبل
    const previousYearStudentCount = await Student.countDocuments({
      organizationalUnitCode: examCenter.code,
      academicYear: previousYear.name,
    });

    // بررسی تکمیل اطلاعات سال قبل
    const isPreviousYearComplete =
      previousYearStudentCount >= previousYearStats.totalStudents;

    // دریافت آمار واحد سازمانی برای سال جاری
    const currentYearStats = await ExamCenterStats.findOne({
      organizationalUnitCode: examCenter.code,
      academicYear: activeYear.name,
    });

    // شمارش تعداد دانش‌آموزان ثبت شده در سال جاری
    const currentYearStudentCount = await Student.countDocuments({
      organizationalUnitCode: examCenter.code,
      academicYear: activeYear.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        isPreviousYearComplete,
        previousYear: {
          name: previousYear.name,
          totalStudents: previousYearStats.totalStudents,
          registeredStudents: previousYearStudentCount,
        },
        currentYear: {
          name: activeYear.name,
          totalStudents: currentYearStats?.totalStudents || 0,
          registeredStudents: currentYearStudentCount,
        },
      },
    });
  } catch (error) {
    console.error("Error checking student stats:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطای سرور" },
      { status: 500 }
    );
  }
}
