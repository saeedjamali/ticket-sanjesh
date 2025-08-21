import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ApprovalReason from "@/models/ApprovalReason";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// GET /api/transfer-settings/approval-reasons - دریافت لیست دلایل موافقت/مخالفت
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // approval or rejection

    let query = {};
    if (type && ["approval", "rejection"].includes(type)) {
      query.type = type;
    }

    const reasons = await ApprovalReason.find(query)
      .sort({ type: 1, code: 1 })
      .lean();

    const formattedReasons = reasons.map((reason) => ({
      ...reason,
      _id: reason._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      reasons: formattedReasons,
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-settings/approval-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت اطلاعات دلایل موافقت/مخالفت",
      },
      { status: 500 }
    );
  }
}

// POST /api/transfer-settings/approval-reasons - ایجاد دلیل موافقت/مخالفت جدید
export async function POST(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const data = await request.json();

    // اعتبارسنجی فیلدهای اجباری
    if (!data.type || !data.code || !data.title) {
      return NextResponse.json(
        { success: false, error: "نوع، کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    // اعتبارسنجی نوع
    if (!["approval", "rejection"].includes(data.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "نوع باید موافقت (approval) یا مخالفت (rejection) باشد",
        },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingReason = await ApprovalReason.findOne({ code: data.code });
    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "کد دلیل تکراری است" },
        { status: 400 }
      );
    }

    const newReason = new ApprovalReason({
      type: data.type,
      code: data.code.trim(),
      title: data.title.trim(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    await newReason.save();

    return NextResponse.json({
      success: true,
      reason: {
        ...newReason.toObject(),
        _id: newReason._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in POST /api/transfer-settings/approval-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد دلیل موافقت/مخالفت",
      },
      { status: 500 }
    );
  }
}

// PUT /api/transfer-settings/approval-reasons - ویرایش دلیل موافقت/مخالفت
export async function PUT(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const data = await request.json();

    // اعتبارسنجی فیلدهای اجباری
    if (!data.id || !data.type || !data.code || !data.title) {
      return NextResponse.json(
        { success: false, error: "شناسه، نوع، کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    // اعتبارسنجی نوع
    if (!["approval", "rejection"].includes(data.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "نوع باید موافقت (approval) یا مخالفت (rejection) باشد",
        },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد (به جز خود رکورد)
    const existingReason = await ApprovalReason.findOne({
      code: data.code,
      _id: { $ne: data.id },
    });
    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "کد دلیل تکراری است" },
        { status: 400 }
      );
    }

    const updatedReason = await ApprovalReason.findByIdAndUpdate(
      data.id,
      {
        type: data.type,
        code: data.code.trim(),
        title: data.title.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedReason) {
      return NextResponse.json(
        { success: false, error: "دلیل موافقت/مخالفت یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reason: {
        ...updatedReason.toObject(),
        _id: updatedReason._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in PUT /api/transfer-settings/approval-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ویرایش دلیل موافقت/مخالفت",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transfer-settings/approval-reasons - حذف دلیل موافقت/مخالفت
export async function DELETE(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
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
        { success: false, error: "شناسه دلیل الزامی است" },
        { status: 400 }
      );
    }

    const deletedReason = await ApprovalReason.findByIdAndDelete(id);

    if (!deletedReason) {
      return NextResponse.json(
        { success: false, error: "دلیل موافقت/مخالفت یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "دلیل موافقت/مخالفت با موفقیت حذف شد",
    });
  } catch (error) {
    console.error(
      "Error in DELETE /api/transfer-settings/approval-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف دلیل موافقت/مخالفت",
      },
      { status: 500 }
    );
  }
}
