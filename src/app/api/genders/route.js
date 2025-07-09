import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import Gender from "@/models/Gender";

// GET - دریافت لیست جنسیت‌ها
export async function GET(request) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    // فیلتر جستجو
    const filter = {};
    if (search) {
      filter.$or = [
        { genderTitle: { $regex: search, $options: "i" } },
        { genderCode: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // دریافت داده‌ها
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Gender.find(filter)
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Gender.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("خطا در دریافت جنسیت‌ها:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}

// POST - اضافه کردن جنسیت جدید
export async function POST(request) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { genderCode, genderTitle } = body;

    // اعتبارسنجی داده‌ها
    if (!genderCode || !genderTitle) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingItem = await Gender.findOne({
      genderCode: genderCode.trim(),
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "این کد جنسیت قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // ایجاد مورد جدید
    const newItem = new Gender({
      genderCode: genderCode.trim(),
      genderTitle: genderTitle.trim(),
      createdBy: user.id,
    });

    await newItem.save();

    return NextResponse.json(
      {
        success: true,
        message: "جنسیت با موفقیت اضافه شد",
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("خطا در اضافه کردن جنسیت:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این کد جنسیت قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "خطا در ثبت اطلاعات" }, { status: 500 });
  }
}
