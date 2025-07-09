import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseGrade from "@/models/CourseGrade";
import mongoose from "mongoose";

// PUT - ویرایش دوره-پایه
export async function PUT(request, { params }) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const { id } = params;

    // بررسی معتبر بودن ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }

    const body = await request.json();
    const { courseCode, courseName, gradeCode, gradeName, isActive } = body;

    // اعتبارسنجی داده‌ها
    if (!courseCode || !courseName || !gradeCode || !gradeName) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی وجود آیتم
    const existingItem = await CourseGrade.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن (به جز خود آیتم)
    const duplicateItem = await CourseGrade.findOne({
      _id: { $ne: id },
      courseCode,
      gradeCode,
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: "این ترکیب دوره-پایه قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // به‌روزرسانی آیتم
    const updatedItem = await CourseGrade.findByIdAndUpdate(
      id,
      {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        gradeCode: gradeCode.trim(),
        gradeName: gradeName.trim(),
        isActive: isActive !== undefined ? isActive : existingItem.isActive,
        updatedBy: user.id,
      },
      { new: true, runValidators: true }
    ).populate("createdBy updatedBy", "name");

    return NextResponse.json({
      success: true,
      message: "دوره-پایه با موفقیت به‌روزرسانی شد",
      data: updatedItem,
    });
  } catch (error) {
    console.error("خطا در به‌روزرسانی دوره-پایه:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این ترکیب دوره-پایه قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطا در به‌روزرسانی اطلاعات" },
      { status: 500 }
    );
  }
}

// DELETE - حذف دوره-پایه
export async function DELETE(request, { params }) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const { id } = params;

    // بررسی معتبر بودن ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }

    // بررسی وجود آیتم
    const existingItem = await CourseGrade.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // حذف آیتم
    await CourseGrade.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "دوره-پایه با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("خطا در حذف دوره-پایه:", error);
    return NextResponse.json({ error: "خطا در حذف اطلاعات" }, { status: 500 });
  }
}
