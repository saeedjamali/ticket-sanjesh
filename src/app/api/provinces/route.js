import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Province from "@/models/Province";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import validateToken from "@/lib/validateToken";
import { ROLES } from "@/lib/permissions";

// GET /api/provinces - دریافت همه استان‌ها
export async function GET(request) {
  try {
    await connectDB();

    const user = await validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    const provinces = await Province.find()
      .sort({ name: 1 })
      .select("name code districtsCount createdAt academicYear")
      .lean();

    return NextResponse.json({
      success: true,
      provinces,
    });
  } catch (error) {
    console.error("Error in GET /api/provinces:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در دریافت اطلاعات استان‌ها",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// POST /api/provinces - ایجاد استان جدید
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
    if (user.role !== ROLES.SYSTEM_ADMIN && user.role !== ROLES.GENERAL_MANAGER) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // اعتبارسنجی داده‌های ورودی
    if (!data.name?.trim() || !data.code?.trim()) {
      return NextResponse.json(
        { success: false, error: "نام و کد استان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد استان
    const existingProvince = await Province.findOne({
      $or: [{ code: data.code.trim() }, { name: data.name.trim() }],
    });
    if (existingProvince) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingProvince.code === data.code.trim()
              ? "این کد استان قبلاً ثبت شده است"
              : "این نام استان قبلاً ثبت شده است",
        },
        { status: 400 }
      );
    }

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true });
    if (!activeAcademicYear) {
      return NextResponse.json(
        {
          success: false,
          error:
            "سال تحصیلی فعال یافت نشد. لطفا ابتدا یک سال تحصیلی فعال تعریف کنید",
        },
        { status: 400 }
      );
    }

    // ایجاد استان جدید
    const province = new Province({
      name: data.name.trim(),
      code: data.code.trim(),
      academicYear: activeAcademicYear.year,
      createdBy: user.id,
    });

    await province.save();

    return NextResponse.json({
      success: true,
      province,
    });
  } catch (error) {
    console.error("Error in POST /api/provinces:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در ایجاد استان",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// PUT /api/provinces/[id] - ویرایش استان
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
    if (user.role !== ROLES.SYSTEM_ADMIN && user.role !== ROLES.GENERAL_MANAGER) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه استان الزامی است" },
        { status: 400 }
      );
    }

    const data = await request.json();

    // اعتبارسنجی داده‌های ورودی
    if (!data.name?.trim() || !data.code?.trim()) {
      return NextResponse.json(
        { success: false, error: "نام و کد استان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی وجود استان
    const province = await Province.findById(id);
    if (!province) {
      return NextResponse.json(
        { success: false, error: "استان مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن کد استان
    const existingProvince = await Province.findOne({
      _id: { $ne: id },
      $or: [{ code: data.code.trim() }, { name: data.name.trim() }],
    });
    if (existingProvince) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingProvince.code === data.code.trim()
              ? "این کد استان قبلاً ثبت شده است"
              : "این نام استان قبلاً ثبت شده است",
        },
        { status: 400 }
      );
    }

    // بروزرسانی استان
    province.name = data.name.trim();
    province.code = data.code.trim();
    province.updatedBy = user.id;
    province.updatedAt = new Date();

    await province.save();

    return NextResponse.json({
      success: true,
      province,
    });
  } catch (error) {
    console.error("Error in PUT /api/provinces:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در ویرایش استان",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// DELETE /api/provinces/[id] - حذف استان
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
    if (user.role !== ROLES.SYSTEM_ADMIN && user.role !== ROLES.GENERAL_MANAGER) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این عملیات را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه استان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی وجود استان
    const province = await Province.findById(id);
    if (!province) {
      return NextResponse.json(
        { success: false, error: "استان مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود مناطق وابسته
    const hasDistricts = await District.exists({ province: id });
    if (hasDistricts) {
      return NextResponse.json(
        {
          success: false,
          error: "این استان دارای مناطق وابسته است و قابل حذف نیست",
        },
        { status: 400 }
      );
    }

    await province.deleteOne();

    return NextResponse.json({
      success: true,
      message: "استان با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/provinces:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در حذف استان",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}
