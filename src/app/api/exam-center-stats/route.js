import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import Province from "@/models/Province";
import District from "@/models/District";
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
    const course = searchParams.get("course") || "";

    // ساخت فیلتر
    const filter = {};

    if (search) {
      filter.organizationalUnitCode = { $regex: search, $options: "i" };
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (course) {
      filter.courseCode = course;
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

    // اضافه کردن نام واحد سازمانی
    const statsWithNames = await Promise.all(
      stats.map(async (stat) => {
        const examCenter = await ExamCenter.findOne({
          code: stat.organizationalUnitCode,
        }).lean();

        return {
          ...stat,
          organizationalUnitName: examCenter?.name || "نامشخص",
        };
      })
    );

    return NextResponse.json({
      success: true,
      stats: statsWithNames,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching exam center stats:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت آمار واحدهای سازمانی" },
      { status: 500 }
    );
  }
}

// POST - ایجاد آمار جدید
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

    const {
      organizationalUnitCode,
      academicYear,
      courseCode,
      courseName,
      totalStudents,
      classifiedStudents,
      totalClasses,
      femaleStudents,
      maleStudents,
      provinceCode,
      districtCode,
    } = await request.json();

    // اعتبارسنجی فیلدهای الزامی
    if (
      !organizationalUnitCode ||
      !academicYear ||
      !courseCode ||
      !courseName
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "کد واحد سازمانی، سال تحصیلی و دوره تحصیلی الزامی است",
        },
        { status: 400 }
      );
    }

    // بررسی وجود واحد سازمانی
    const examCenter = await ExamCenter.findOne({
      code: organizationalUnitCode,
    }).populate({
      path: "district",
      populate: { path: "province" },
    });

    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی با این کد یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود سال تحصیلی
    const academicYearExists = await AcademicYear.findOne({
      name: academicYear,
    });

    if (!academicYearExists) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی معتبر نیست" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن آمار
    const existingStats = await ExamCenterStats.findOne({
      organizationalUnitCode,
      academicYear,
      courseCode,
    });

    if (existingStats) {
      return NextResponse.json(
        {
          success: false,
          error:
            "آمار این واحد سازمانی برای این سال تحصیلی و دوره قبلاً ثبت شده است",
        },
        { status: 400 }
      );
    }

    // ایجاد آمار جدید
    const newStats = new ExamCenterStats({
      organizationalUnitCode,
      academicYear,
      courseCode,
      courseName,
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

    return NextResponse.json({
      success: true,
      message: "آمار واحد سازمانی با موفقیت ثبت شد",
      data: newStats,
    });
  } catch (error) {
    console.error("Error creating exam center stats:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت آمار واحد سازمانی" },
      { status: 500 }
    );
  }
}
