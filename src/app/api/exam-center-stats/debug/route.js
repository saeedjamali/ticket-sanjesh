import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
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

    // بررسی دسترسی - مدیر سیستم و مدیر واحد سازمانی
    if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.EXAM_CENTER_MANAGER
    ) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    // دریافت سال تحصیلی فعال
    const activeYear = await AcademicYear.findOne({ isActive: true });

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

    if (!previousYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی قبل یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت آمار واحد سازمانی
    const examCenterCode =
      user.role === ROLES.EXAM_CENTER_MANAGER
        ? user.examCenter
        : request.nextUrl.searchParams.get("code");

    console.log("Searching for stats with code:", examCenterCode);

    // پیدا کردن واحد سازمانی
    const ExamCenter = mongoose.model("ExamCenter");
    const examCenter = await ExamCenter.findById(examCenterCode);
    console.log("Found exam center:", examCenter);

    if (!examCenter) {
      return NextResponse.json({
        success: false,
        message: "واحد سازمانی یافت نشد",
        debug: { examCenterCode },
      });
    }

    // اول همه آمارهای موجود را بگیریم
    const allStats = await ExamCenterStats.find({});

    // حالا آمار این واحد سازمانی را بگیریم
    const stats = await ExamCenterStats.find({
      organizationalUnitCode: examCenter.code,
      academicYear: { $in: [activeYear.name, previousYear.name] },
    });

    return NextResponse.json({
      success: true,
      data: {
        examCenter: {
          id: examCenter._id,
          code: examCenter.code,
          name: examCenter.name,
        },
        activeYear: activeYear.name,
        previousYear: previousYear.name,
        stats,
        debug: {
          totalStatsCount: allStats.length,
          uniqueUnitCodes: [
            ...new Set(allStats.map((s) => s.organizationalUnitCode)),
          ],
        },
      },
    });
  } catch (error) {
    console.error("Error in debug stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}
