import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import { authService } from "@/lib/auth/authService";

// GET /api/transfer-applicant/profile-correction-requests - دریافت درخواست‌های اصلاح مشخصات کاربر
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

    // دریافت تمام درخواست‌های کاربر
    const requests = await ProfileCorrectionRequest.find({
      userId: userAuth.id,
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
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-applicant/profile-correction-requests:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت درخواست‌های اصلاح مشخصات",
      },
      { status: 500 }
    );
  }
}

