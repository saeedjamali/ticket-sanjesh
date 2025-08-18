import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ExamCenter from "@/models/ExamCenter";
import ExamCenterStats from "@/models/ExamCenterStats";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی مجاز به دریافت این اطلاعات هستند
    if (
      user.role !== ROLES.EXAM_CENTER_MANAGER &&
      user.role !== "examCenterManager"
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به دریافت این اطلاعات نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    // دریافت اطلاعات واحد سازمانی کاربر
    const examCenter = await ExamCenter.findById(user.examCenter);
    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true })
      .select("name")
      .lean();

    if (!activeAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی فعال یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت سال تحصیلی قبل
    const previousAcademicYear = await AcademicYear.findOne({
      name: { $lt: activeAcademicYear.name },
    })
      .sort({ name: -1 })
      .select("name")
      .lean();

    if (!previousAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی قبل یافت نشد" },
        { status: 404 }
      );
    }

    // جستجو برای آمار سال قبل
    const stats = await ExamCenterStats.findOne({
      organizationalUnitCode: examCenter.code,
      academicYear: previousAcademicYear.name,
      isActive: true,
    });

    let defaultTotalClasses = 0;
    if (stats && stats.totalClasses > 0) {
      defaultTotalClasses = stats.totalClasses;
    }

    return NextResponse.json({
      success: true,
      data: {
        defaultTotalClasses,
        academicYear: previousAcademicYear.name,
        examCenterCode: examCenter.code,
        hasStats: !!stats,
      },
    });
  } catch (error) {
    console.error("Error fetching default classes:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات پیش‌فرض کلاس‌ها" },
      { status: 500 }
    );
  }
}
