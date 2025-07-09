import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseGrade from "@/models/CourseGrade";

// GET - دریافت لیست دوره-پایه‌ها
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
        { courseName: { $regex: search, $options: "i" } },
        { gradeName: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
        { gradeCode: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // دریافت داده‌ها
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CourseGrade.find(filter)
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseGrade.countDocuments(filter),
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
    console.error("خطا در دریافت دوره-پایه‌ها:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}

// POST - اضافه کردن دوره-پایه جدید
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
    const { courseCode, courseName, gradeCode, gradeName } = body;

    // اعتبارسنجی داده‌ها
    if (!courseCode || !courseName || !gradeCode || !gradeName) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن
    const existingItem = await CourseGrade.findOne({
      courseCode,
      gradeCode,
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "این ترکیب دوره-پایه قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // ایجاد مورد جدید
    const newItem = new CourseGrade({
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      gradeCode: gradeCode.trim(),
      gradeName: gradeName.trim(),
      createdBy: user.id,
    });

    await newItem.save();

    return NextResponse.json(
      {
        success: true,
        message: "دوره-پایه با موفقیت اضافه شد",
        data: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("خطا در اضافه کردن دوره-پایه:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "این ترکیب دوره-پایه قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "خطا در ثبت اطلاعات" }, { status: 500 });
  }
}
