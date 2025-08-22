import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import User from "@/models/User";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";

// GET /api/admin/profile-correction-requests/province - دریافت درخواست‌های اصلاح مشخصات استان
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران provinceTransferExpert
    if (userAuth.role !== "provinceTransferExpert") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت اطلاعات کاربر کامل با populate کردن province
    const user = await User.findById(userAuth.id).populate("province");

    if (!user || !user.province) {
      return NextResponse.json(
        { success: false, error: "اطلاعات استان کاربر یافت نشد" },
        { status: 404 }
      );
    }

    const provinceCode = user.province.code;

    // دریافت درخواست‌های استان
    const requests = await ProfileCorrectionRequest.find({
      provinceCode: provinceCode,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests: requests.map((req) => ({
        ...req.toObject(),
        _id: req._id.toString(),
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        respondedAt: req.respondedAt ? req.respondedAt.toISOString() : null,
      })),
      provinceCode,
    });
  } catch (error) {
    console.error(
      "Error in GET /api/admin/profile-correction-requests/province:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت درخواست‌های اصلاح مشخصات استان",
      },
      { status: 500 }
    );
  }
}
