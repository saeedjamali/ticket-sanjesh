import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferReason from "@/models/TransferReason";
import { authService } from "@/lib/auth/authService";

// GET /api/transfer-applicant/transfer-reasons - دریافت لیست دلایل انتقال
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

    // دریافت دلایل انتقال فعال مرتب شده بر اساس order
    const transferReasons = await TransferReason.find({
      isActive: true,
    }).sort({ order: 1 });

    return NextResponse.json({
      success: true,
      transferReasons: transferReasons.map((reason) => ({
        ...reason.toObject(),
        _id: reason._id.toString(),
        createdAt: reason.createdAt.toISOString(),
        updatedAt: reason.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-applicant/transfer-reasons:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت دلایل انتقال",
      },
      { status: 500 }
    );
  }
}


