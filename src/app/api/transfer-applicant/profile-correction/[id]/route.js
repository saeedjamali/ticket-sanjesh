import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import { authService } from "@/lib/auth/authService";

// DELETE /api/transfer-applicant/profile-correction/[id] - حذف درخواست اصلاح مشخصات
export async function DELETE(request, { params }) {
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

    const { id } = params;

    // بررسی وجود درخواست
    const request = await ProfileCorrectionRequest.findById(id);

    if (!request) {
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی مالکیت درخواست
    if (request.userId.toString() !== userAuth.id) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی به این درخواست" },
        { status: 403 }
      );
    }

    // فقط درخواست‌های با وضعیت pending قابل حذف هستند
    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "فقط درخواست‌های در انتظار قابل حذف هستند" },
        { status: 400 }
      );
    }

    // حذف درخواست
    await ProfileCorrectionRequest.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "درخواست اصلاح مشخصات با موفقیت حذف شد",
    });
  } catch (error) {
    console.error(
      "Error in DELETE /api/transfer-applicant/profile-correction/[id]:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف درخواست اصلاح مشخصات",
      },
      { status: 500 }
    );
  }
}

