import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseBranchField from "@/models/CourseBranchField";

// GET - دریافت لیست دوره-شاخه-رشته‌ها
export async function GET(request) {
  try {
    // احراز هویت
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

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
        { courseTitle: { $regex: search, $options: "i" } },
        { branchTitle: { $regex: search, $options: "i" } },
        { fieldTitle: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
        { branchCode: { $regex: search, $options: "i" } },
        { fieldCode: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // دریافت داده‌ها
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CourseBranchField.find(filter)
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseBranchField.countDocuments(filter),
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
    console.error("خطا در دریافت دوره-شاخه-رشته‌ها:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}

// POST - اضافه کردن دوره-شاخه-رشته جدید
export async function POST(request) {
  try {
    // احراز هویت
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      courseCode,
      courseTitle,
      branchCode,
      branchTitle,
      fieldCode,
      fieldTitle,
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

    // بررسی تکراری نبودن
    const existingItem = await CourseBranchField.findOne({
      courseCode,
      branchCode,
      fieldCode,
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "این ترکیب دوره-شاخه-رشته قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // ایجاد مورد جدید
    const newItem = new CourseBranchField({
      courseCode: courseCode.trim(),
      courseTitle: courseTitle.trim(),
      branchCode: branchCode.trim(),
      branchTitle: branchTitle.trim(),
      fieldCode: fieldCode.trim(),
      fieldTitle: fieldTitle.trim(),
      createdBy: user.id,
    });

    await newItem.save();

    return NextResponse.json(
      {
        success: true,
        message: "دوره-شاخه-رشته با موفقیت اضافه شد",
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("خطا در اضافه کردن دوره-شاخه-رشته:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این ترکیب دوره-شاخه-رشته قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "خطا در ثبت اطلاعات" }, { status: 500 });
  }
}
