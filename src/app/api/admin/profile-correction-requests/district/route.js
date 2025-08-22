import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import User from "@/models/User";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";

// GET /api/admin/profile-correction-requests/district - دریافت درخواست‌های اصلاح مشخصات منطقه
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران districtTransferExpert
    if (userAuth.role !== "districtTransferExpert") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت اطلاعات کاربر کامل با populate کردن district
    const user = await User.findById(userAuth.id).populate("district");

    if (!user || !user.district) {
      return NextResponse.json(
        { success: false, error: "اطلاعات منطقه کاربر یافت نشد" },
        { status: 404 }
      );
    }

    const districtCode = user.district.code;

    // دریافت درخواست‌های منطقه
    const requests = await ProfileCorrectionRequest.find({
      districtCode: districtCode,
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
      districtCode,
    });
  } catch (error) {
    console.error(
      "Error in GET /api/admin/profile-correction-requests/district:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت درخواست‌های اصلاح مشخصات منطقه",
      },
      { status: 500 }
    );
  }
}
