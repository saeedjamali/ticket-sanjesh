import { NextResponse } from "next/server";
import AcademicYear from "@/models/AcademicYear";
import validateToken from "@/lib/validateToken";
import connectDB from "@/lib/db";
import { ROLES } from "@/lib/permissions";

// PUT /api/academic-years/[id] - فعال‌سازی سال تحصیلی
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

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه سال تحصیلی الزامی است" },
        { status: 400 }
      );
    }

    // غیرفعال کردن همه سال‌های تحصیلی
    await AcademicYear.updateMany({}, { isActive: false });

    // فعال کردن سال تحصیلی مورد نظر
    const academicYear = await AcademicYear.findByIdAndUpdate(
      id,
      { isActive: true, updatedBy: user.id },
      { new: true }
    ).populate([
      { path: "createdBy", select: "fullName" },
      { path: "updatedBy", select: "fullName" },
    ]);

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      academicYear: {
        ...academicYear.toObject(),
        _id: academicYear._id.toString(),
        createdBy: academicYear.createdBy
          ? {
              ...academicYear.createdBy.toObject(),
              _id: academicYear.createdBy._id.toString(),
            }
          : null,
        updatedBy: academicYear.updatedBy
          ? {
              ...academicYear.updatedBy.toObject(),
              _id: academicYear.updatedBy._id.toString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/academic-years/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در فعال‌سازی سال تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// DELETE /api/academic-years/[id] - حذف سال تحصیلی
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

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه سال تحصیلی الزامی است" },
        { status: 400 }
      );
    }

    // بررسی وجود سال تحصیلی
    const academicYear = await AcademicYear.findById(id);
    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی فعال نبودن سال تحصیلی
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
    console.error("Error in DELETE /api/academic-years/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در حذف سال تحصیلی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}
