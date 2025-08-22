import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PreliminaryNotice from "@/models/PreliminaryNotice";
import { authService } from "@/lib/auth/authService";

// GET /api/transfer-applicant/preliminary-notices - دریافت لیست تذکرات اولیه برای متقاضیان انتقال
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران transferApplicant
    if (userAuth.role !== "transferApplicant") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت فقط تذکرات فعال
    const notices = await PreliminaryNotice.find({ isActive: true })
      .sort({ code: 1 })
      .lean();

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
      "Error in GET /api/transfer-applicant/preliminary-notices:",
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

