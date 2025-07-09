import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import OrganizationalUnitType from "@/models/OrganizationalUnitType";

// GET - دریافت لیست نوع واحد سازمانی
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
        { unitTypeTitle: { $regex: search, $options: "i" } },
        { unitTypeCode: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // دریافت داده‌ها
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      OrganizationalUnitType.find(filter)
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrganizationalUnitType.countDocuments(filter),
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
    console.error("خطا در دریافت انواع واحد سازمانی:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}

// POST - اضافه کردن نوع واحد سازمانی جدید
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
    const { unitTypeCode, unitTypeTitle } = body;

    // اعتبارسنجی داده‌ها
    if (!unitTypeCode || !unitTypeTitle) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingItem = await OrganizationalUnitType.findOne({
      unitTypeCode: unitTypeCode.trim(),
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "این کد نوع واحد سازمانی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // ایجاد مورد جدید
    const newItem = new OrganizationalUnitType({
      unitTypeCode: unitTypeCode.trim(),
      unitTypeTitle: unitTypeTitle.trim(),
      createdBy: user.id,
    });

    await newItem.save();

    return NextResponse.json(
      {
        success: true,
        message: "نوع واحد سازمانی با موفقیت اضافه شد",
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("خطا در اضافه کردن نوع واحد سازمانی:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این کد نوع واحد سازمانی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "خطا در ثبت اطلاعات" }, { status: 500 });
  }
}
