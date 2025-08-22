import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferReason from "@/models/TransferReason";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// GET /api/transfer-settings/transfer-reasons - دریافت لیست علل انتقال
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
      ![
        ROLES.SYSTEM_ADMIN,
        ROLES.PROVINCE_TRANSFER_EXPERT,
        ROLES.DISTRICT_TRANSFER_EXPERT,
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const reasons = await TransferReason.find({})
      .sort({ order: 1, code: 1 })
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
      "Error in GET /api/transfer-settings/transfer-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت اطلاعات علل انتقال",
      },
      { status: 500 }
    );
  }
}

// POST /api/transfer-settings/transfer-reasons - ایجاد علت انتقال جدید
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
    if (!data.code || !data.title || !data.reasonCode || !data.reasonTitle) {
      return NextResponse.json(
        { success: false, error: "کد، عنوان، کد علت و عنوان علت الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingReason = await TransferReason.findOne({ code: data.code });
    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "کد علت انتقال تکراری است" },
        { status: 400 }
      );
    }

    // اعتبارسنجی فیلدهای جدید
    if (data.hasYearsLimit && (!data.yearsLimit || data.yearsLimit < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "در صورت فعال بودن محدودیت سنوات، مقدار سنوات باید مثبت باشد",
        },
        { status: 400 }
      );
    }

    const newReason = new TransferReason({
      code: data.code.trim(),
      title: data.title.trim(),
      reasonCode: data.reasonCode.trim(),
      reasonTitle: data.reasonTitle.trim(),
      requiresAdminApproval: Boolean(data.requiresAdminApproval),
      description: data.description ? data.description.trim() : "",
      order: Number(data.order) || 0,
      requiresDocumentUpload: Boolean(data.requiresDocumentUpload),
      requiredDocumentsCount: Number(data.requiredDocumentsCount) || 0,
      hasYearsLimit: Boolean(data.hasYearsLimit),
      yearsLimit: data.hasYearsLimit ? Number(data.yearsLimit) : null,
      isCulturalCouple: Boolean(data.isCulturalCouple),
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
      "Error in POST /api/transfer-settings/transfer-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد علت انتقال",
      },
      { status: 500 }
    );
  }
}

// PUT /api/transfer-settings/transfer-reasons - ویرایش علت انتقال
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
    if (
      !data.id ||
      !data.code ||
      !data.title ||
      !data.reasonCode ||
      !data.reasonTitle
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه، کد، عنوان، کد علت و عنوان علت الزامی است",
        },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد (به جز خود رکورد)
    const existingReason = await TransferReason.findOne({
      code: data.code,
      _id: { $ne: data.id },
    });
    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "کد علت انتقال تکراری است" },
        { status: 400 }
      );
    }

    // اعتبارسنجی فیلدهای جدید
    if (data.hasYearsLimit && (!data.yearsLimit || data.yearsLimit < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "در صورت فعال بودن محدودیت سنوات، مقدار سنوات باید مثبت باشد",
        },
        { status: 400 }
      );
    }

    const updatedReason = await TransferReason.findByIdAndUpdate(
      data.id,
      {
        code: data.code.trim(),
        title: data.title.trim(),
        reasonCode: data.reasonCode.trim(),
        reasonTitle: data.reasonTitle.trim(),
        requiresAdminApproval: Boolean(data.requiresAdminApproval),
        description: data.description ? data.description.trim() : "",
        order: Number(data.order) || 0,
        requiresDocumentUpload: Boolean(data.requiresDocumentUpload),
        requiredDocumentsCount: Number(data.requiredDocumentsCount) || 0,
        hasYearsLimit: Boolean(data.hasYearsLimit),
        yearsLimit: data.hasYearsLimit ? Number(data.yearsLimit) : null,
        isCulturalCouple: Boolean(data.isCulturalCouple),
        isActive: data.isActive !== undefined ? data.isActive : true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedReason) {
      return NextResponse.json(
        { success: false, error: "علت انتقال یافت نشد" },
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
      "Error in PUT /api/transfer-settings/transfer-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ویرایش علت انتقال",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transfer-settings/transfer-reasons - حذف علت انتقال
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
        { success: false, error: "شناسه علت انتقال الزامی است" },
        { status: 400 }
      );
    }

    const deletedReason = await TransferReason.findByIdAndDelete(id);

    if (!deletedReason) {
      return NextResponse.json(
        { success: false, error: "علت انتقال یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "علت انتقال با موفقیت حذف شد",
    });
  } catch (error) {
    console.error(
      "Error in DELETE /api/transfer-settings/transfer-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف علت انتقال",
      },
      { status: 500 }
    );
  }
}
