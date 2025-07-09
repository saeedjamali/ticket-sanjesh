import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import OrganizationalUnitType from "@/models/OrganizationalUnitType";
import mongoose from "mongoose";

// PUT - ویرایش نوع واحد سازمانی
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
    const { unitTypeCode, unitTypeTitle, isActive } = body;

    // اعتبارسنجی داده‌ها
    if (!unitTypeCode || !unitTypeTitle) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی وجود آیتم
    const existingItem = await OrganizationalUnitType.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن (به جز خود آیتم)
    const duplicateItem = await OrganizationalUnitType.findOne({
      _id: { $ne: id },
      unitTypeCode: unitTypeCode.trim(),
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: "این کد نوع واحد سازمانی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // به‌روزرسانی آیتم
    const updatedItem = await OrganizationalUnitType.findByIdAndUpdate(
      id,
      {
        unitTypeCode: unitTypeCode.trim(),
        unitTypeTitle: unitTypeTitle.trim(),
        isActive: isActive !== undefined ? isActive : existingItem.isActive,
        updatedBy: user.id,
      },
      { new: true, runValidators: true }
    ).populate("createdBy updatedBy", "name");

    return NextResponse.json({
      success: true,
      message: "نوع واحد سازمانی با موفقیت به‌روزرسانی شد",
      data: updatedItem,
    });
  } catch (error) {
    console.error("خطا در به‌روزرسانی نوع واحد سازمانی:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این کد نوع واحد سازمانی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطا در به‌روزرسانی اطلاعات" },
      { status: 500 }
    );
  }
}

// DELETE - حذف نوع واحد سازمانی
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
    const existingItem = await OrganizationalUnitType.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { error: "آیتم مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // حذف آیتم
    await OrganizationalUnitType.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "نوع واحد سازمانی با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("خطا در حذف نوع واحد سازمانی:", error);
    return NextResponse.json({ error: "خطا در حذف اطلاعات" }, { status: 500 });
  }
}
