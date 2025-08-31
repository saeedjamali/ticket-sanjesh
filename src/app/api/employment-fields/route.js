import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import EmploymentField from "@/models/EmploymentField";
import { authService } from "@/lib/auth/authService";

// GET /api/employment-fields - دریافت لیست رشته‌های استخدامی
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    let query = {};

    // فیلتر بر اساس وضعیت فعال/غیرفعال
    if (!includeInactive) {
      query.isActive = true;
    }

    // جستجو در صورت وجود
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: { $regex: regex } },
        { fieldCode: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    }

    // محاسبه skip برای pagination
    const skip = (page - 1) * limit;

    // دریافت تعداد کل
    const total = await EmploymentField.countDocuments(query);

    // دریافت داده‌ها
    const employmentFields = await EmploymentField.find(query)
      .populate("createdBy", "firstName lastName ")
      .populate("updatedBy", "firstName lastName ")
      .sort({ fieldCode: 1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: employmentFields,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/employment-fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت رشته‌های استخدامی",
      },
      { status: 500 }
    );
  }
}

// POST /api/employment-fields - ایجاد رشته استخدامی جدید
export async function POST(request) {
  try {
    const user = await authService.validateToken(request);
    console.log("user---------", user);
    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط ادمین‌ها
    if (!["systemAdmin", "superAdmin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { fieldCode, title, description, isActive, isShared } = body;
    console.log("body---------", body);
    // اعتبارسنجی ورودی‌ها
    if (!fieldCode || !title) {
      return NextResponse.json(
        { success: false, error: "کد رشته و عنوان رشته الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد رشته
    const existingField = await EmploymentField.findOne({ fieldCode });
    if (existingField) {
      return NextResponse.json(
        { success: false, error: "کد رشته تکراری است" },
        { status: 400 }
      );
    }

    // ایجاد رشته جدید
    const employmentField = new EmploymentField({
      fieldCode: fieldCode || 0,
      title: title.trim(),
      description: description?.trim(),
      isActive: isActive !== undefined ? isActive : true,
      isShared: isShared !== undefined ? isShared : false,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await employmentField.save();

    // دریافت اطلاعات کامل برای response
    const savedField = await EmploymentField.findById(employmentField._id)
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName");

    return NextResponse.json({
      success: true,
      message: "رشته استخدامی با موفقیت ایجاد شد",
      data: savedField,
    });
  } catch (error) {
    console.error("Error in POST /api/employment-fields:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "کد رشته تکراری است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد رشته استخدامی",
      },
      { status: 500 }
    );
  }
}

// PUT /api/employment-fields - به‌روزرسانی رشته استخدامی
export async function PUT(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط ادمین‌ها
    if (!["systemAdmin", "superAdmin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { id, fieldCode, title, description, isActive, isShared } = body;

    // اعتبارسنجی ورودی‌ها
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه رشته الزامی است" },
        { status: 400 }
      );
    }

    if (!fieldCode || !title) {
      return NextResponse.json(
        { success: false, error: "کد رشته و عنوان رشته الزامی است" },
        { status: 400 }
      );
    }

    // یافتن رشته
    const employmentField = await EmploymentField.findById(id);
    if (!employmentField) {
      return NextResponse.json(
        { success: false, error: "رشته یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن کد رشته (به جز خود این رشته)
    const existingField = await EmploymentField.findOne({
      fieldCode,
      _id: { $ne: id },
    });
    if (existingField) {
      return NextResponse.json(
        { success: false, error: "کد رشته تکراری است" },
        { status: 400 }
      );
    }

    // به‌روزرسانی
    employmentField.fieldCode = fieldCode.trim();
    employmentField.title = title.trim();
    employmentField.description = description?.trim();
    employmentField.isActive =
      isActive !== undefined ? isActive : employmentField.isActive;
    employmentField.isShared =
      isShared !== undefined ? isShared : employmentField.isShared;
    employmentField.updatedBy = user.userId;

    await employmentField.save();

    // دریافت اطلاعات کامل برای response
    const updatedField = await EmploymentField.findById(id)
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName");

    return NextResponse.json({
      success: true,
      message: "رشته استخدامی با موفقیت به‌روزرسانی شد",
      data: updatedField,
    });
  } catch (error) {
    console.error("Error in PUT /api/employment-fields:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "کد رشته تکراری است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطا در به‌روزرسانی رشته استخدامی",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/employment-fields - حذف رشته استخدامی
export async function DELETE(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط ادمین‌ها
    if (!["systemAdmin", "superAdmin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه رشته الزامی است" },
        { status: 400 }
      );
    }

    // یافتن و حذف رشته
    const employmentField = await EmploymentField.findById(id);
    if (!employmentField) {
      return NextResponse.json(
        { success: false, error: "رشته یافت نشد" },
        { status: 404 }
      );
    }

    await EmploymentField.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "رشته استخدامی با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/employment-fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف رشته استخدامی",
      },
      { status: 500 }
    );
  }
}
