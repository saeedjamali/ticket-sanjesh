import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";

// GET - دریافت لیست آمار واحدهای سازمانی
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const academicYear = searchParams.get("academicYear") || "";

    // ساخت فیلتر
    const filter = {};

    if (search) {
      filter.organizationalUnitCode = { $regex: search, $options: "i" };
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const skip = (page - 1) * limit;

    // دریافت آمار با اطلاعات واحد سازمانی
    const [stats, total] = await Promise.all([
      ExamCenterStats.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamCenterStats.countDocuments(filter),
    ]);

    // دریافت اطلاعات واحدهای سازمانی
    const examCenterCodes = stats.map((stat) => stat.organizationalUnitCode);
    const examCenters = await ExamCenter.find({
      code: { $in: examCenterCodes },
    })
      .select("code name")
      .lean();

    // ایجاد نقشه برای جستجوی سریع
    const examCenterMap = examCenters.reduce((acc, center) => {
      acc[center.code] = center.name;
      return acc;
    }, {});

    // اضافه کردن نام واحد سازمانی به آمار
    const statsWithNames = stats.map((stat) => ({
      ...stat,
      organizationalUnitName:
        examCenterMap[stat.organizationalUnitCode] || "نامشخص",
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: statsWithNames,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching exam center stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار واحدهای سازمانی" },
      { status: 500 }
    );
  }
}

// POST - ثبت آمار جدید
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

    const data = await request.json();

    // بررسی وجود واحد سازمانی
    const examCenter = await ExamCenter.findOne({
      code: data.organizationalUnitCode,
    });
    if (!examCenter) {
      return NextResponse.json(
        { success: false, message: "واحد سازمانی یافت نشد" },
        { status: 400 }
      );
    }

    // بررسی وجود سال تحصیلی
    const academicYear = await AcademicYear.findOne({
      name: data.academicYear,
    });
    if (!academicYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی یافت نشد" },
        { status: 400 }
      );
    }

    // ایجاد یا به‌روزرسانی آمار
    const stats = await ExamCenterStats.upsertStats(data, userValid.id);

    return NextResponse.json({
      success: true,
      message: "آمار واحد سازمانی با موفقیت ثبت شد",
      data: stats,
    });
  } catch (error) {
    console.error("Error creating exam center stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "خطا در ثبت آمار واحد سازمانی",
      },
      { status: 500 }
    );
  }
}
