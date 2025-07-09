import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseBranchField from "@/models/CourseBranchField";
import mongoose from "mongoose";

// PUT - ویرایش دوره-شاخه-رشته
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
    const {
      courseCode,
      courseTitle,
      branchCode,
      branchTitle,
      fieldCode,
      fieldTitle,
      isActive,
    } = body;

    // اعتبارسنجی داده‌ها
    if (
      !courseCode ||
      !courseTitle ||
      !branchCode ||
      !branchTitle ||
      !fieldCode ||
      !fieldTitle
    ) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی وجود آیتم
    const existingItem = await CourseBranchField.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن (به جز خود آیتم)
    const duplicateItem = await CourseBranchField.findOne({
      _id: { $ne: id },
      courseCode,
      branchCode,
      fieldCode,
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: "این ترکیب دوره-شاخه-رشته قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // به‌روزرسانی آیتم
    const updatedItem = await CourseBranchField.findByIdAndUpdate(
      id,
      {
        courseCode: courseCode.trim(),
        courseTitle: courseTitle.trim(),
        branchCode: branchCode.trim(),
        branchTitle: branchTitle.trim(),
        fieldCode: fieldCode.trim(),
        fieldTitle: fieldTitle.trim(),
        isActive: isActive !== undefined ? isActive : existingItem.isActive,
        updatedBy: user._id,
      },
      { new: true, runValidators: true }
    ).populate("createdBy updatedBy", "name");

    return NextResponse.json({
      success: true,
      message: "دوره-شاخه-رشته با موفقیت به‌روزرسانی شد",
      data: updatedItem,
    });
  } catch (error) {
    console.error("خطا در به‌روزرسانی دوره-شاخه-رشته:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این ترکیب دوره-شاخه-رشته قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطا در به‌روزرسانی اطلاعات" },
      { status: 500 }
    );
  }
}

// DELETE - حذف دوره-شاخه-رشته
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
    const existingItem = await CourseBranchField.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // حذف آیتم
    await CourseBranchField.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "دوره-شاخه-رشته با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("خطا در حذف دوره-شاخه-رشته:", error);
    return NextResponse.json({ error: "خطا در حذف اطلاعات" }, { status: 500 });
  }
}
