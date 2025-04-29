import { NextResponse } from "next/server";
import AcademicYear from "@/models/AcademicYear";
import connectDB from "@/lib/db";
import { ROLES } from "@/lib/permissions";
import { authService } from "@/lib/auth/authService";

// GET /api/academic-years - دریافت لیست سال‌های تحصیلی
export async function GET(request) {
  try {
    await connectDB();

    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    const academicYears = await AcademicYear.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName")
      .populate("updatedBy", "fullName")
      .lean();

    return NextResponse.json({
      success: true,
      academicYears: academicYears.map((year) => ({
        ...year,
        _id: year._id.toString(),
        createdBy: year.createdBy
          ? {
              ...year.createdBy,
              _id: year.createdBy._id.toString(),
            }
          : null,
        updatedBy: year.updatedBy
          ? {
              ...year.updatedBy,
              _id: year.updatedBy._id.toString(),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/academic-years:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در دریافت لیست سال‌های تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// POST /api/academic-years - ایجاد سال تحصیلی جدید
export async function POST(request) {
  try {
    await connectDB();

    const user = await validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی کاربر
    if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.GENERAL_MANAGER
    ) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { name } = data;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "نام سال تحصیلی الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن نام سال تحصیلی
    const existingYear = await AcademicYear.findOne({ name: name.trim() });
    if (existingYear) {
      return NextResponse.json(
        { success: false, error: "این سال تحصیلی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    const academicYear = new AcademicYear({
      name: name.trim(),
      isActive: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await academicYear.save();

    const savedYear = await academicYear.populate([
      { path: "createdBy", select: "fullName" },
      { path: "updatedBy", select: "fullName" },
    ]);

    return NextResponse.json({
      success: true,
      academicYear: {
        ...savedYear.toObject(),
        _id: savedYear._id.toString(),
        createdBy: savedYear.createdBy
          ? {
              ...savedYear.createdBy.toObject(),
              _id: savedYear.createdBy._id.toString(),
            }
          : null,
        updatedBy: savedYear.updatedBy
          ? {
              ...savedYear.updatedBy.toObject(),
              _id: savedYear.updatedBy._id.toString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/academic-years:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در ایجاد سال تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// PUT /api/academic-years/[id]/activate - Activate an academic year
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const user = await validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!["systemAdmin", "generalManager"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه سال تحصیلی الزامی است" },
        { status: 400 }
      );
    }

    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Deactivate all years and activate the selected one
    await AcademicYear.updateMany({}, { isActive: false });
    academicYear.isActive = true;
    academicYear.updatedBy = user.id;
    academicYear.updatedAt = new Date();
    await academicYear.save();

    return NextResponse.json({
      success: true,
      academicYear,
    });
  } catch (error) {
    console.error("Error in PUT /api/academic-years:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در فعال‌سازی سال تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// DELETE /api/academic-years/[id] - Delete an academic year
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const user = await validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!["systemAdmin", "generalManager"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه سال تحصیلی الزامی است" },
        { status: 400 }
      );
    }

    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Prevent deletion of active academic year
    if (academicYear.isActive) {
      return NextResponse.json(
        { success: false, error: "امکان حذف سال تحصیلی فعال وجود ندارد" },
        { status: 400 }
      );
    }

    await academicYear.deleteOne();

    return NextResponse.json({
      success: true,
      message: "سال تحصیلی با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/academic-years:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در حذف سال تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}
