import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PreliminaryNotice from "@/models/PreliminaryNotice";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// GET /api/transfer-settings/preliminary-notices - دریافت لیست تذکرات اولیه
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

    const notices = await PreliminaryNotice.find({}).sort({ code: 1 }).lean();

    const formattedNotices = notices.map((notice) => ({
      ...notice,
      _id: notice._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      notices: formattedNotices,
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-settings/preliminary-notices:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت اطلاعات تذکرات اولیه",
      },
      { status: 500 }
    );
  }
}

// POST /api/transfer-settings/preliminary-notices - ایجاد تذکر اولیه جدید
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
    if (!data.code || !data.title) {
      return NextResponse.json(
        { success: false, error: "کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingNotice = await PreliminaryNotice.findOne({ code: data.code });
    if (existingNotice) {
      return NextResponse.json(
        { success: false, error: "کد تذکر تکراری است" },
        { status: 400 }
      );
    }

    const newNotice = new PreliminaryNotice({
      code: data.code.trim(),
      title: data.title.trim(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    await newNotice.save();

    return NextResponse.json({
      success: true,
      notice: {
        ...newNotice.toObject(),
        _id: newNotice._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in POST /api/transfer-settings/preliminary-notices:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد تذکر اولیه",
      },
      { status: 500 }
    );
  }
}

// PUT /api/transfer-settings/preliminary-notices - ویرایش تذکر اولیه
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
    if (!data.id || !data.code || !data.title) {
      return NextResponse.json(
        { success: false, error: "شناسه، کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد (به جز خود رکورد)
    const existingNotice = await PreliminaryNotice.findOne({
      code: data.code,
      _id: { $ne: data.id },
    });
    if (existingNotice) {
      return NextResponse.json(
        { success: false, error: "کد تذکر تکراری است" },
        { status: 400 }
      );
    }

    const updatedNotice = await PreliminaryNotice.findByIdAndUpdate(
      data.id,
      {
        code: data.code.trim(),
        title: data.title.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedNotice) {
      return NextResponse.json(
        { success: false, error: "تذکر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notice: {
        ...updatedNotice.toObject(),
        _id: updatedNotice._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in PUT /api/transfer-settings/preliminary-notices:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ویرایش تذکر اولیه",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transfer-settings/preliminary-notices - حذف تذکر اولیه
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
        { success: false, error: "شناسه تذکر الزامی است" },
        { status: 400 }
      );
    }

    const deletedNotice = await PreliminaryNotice.findByIdAndDelete(id);

    if (!deletedNotice) {
      return NextResponse.json(
        { success: false, error: "تذکر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تذکر با موفقیت حذف شد",
    });
  } catch (error) {
    console.error(
      "Error in DELETE /api/transfer-settings/preliminary-notices:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف تذکر اولیه",
      },
      { status: 500 }
    );
  }
}
