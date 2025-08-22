import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import { authService } from "@/lib/auth/authService";

// PUT /api/admin/profile-correction-requests/[id]/respond - پاسخ به درخواست اصلاح مشخصات
export async function PUT(request, { params }) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران districtTransferExpert و provinceTransferExpert
    if (
      !["districtTransferExpert", "provinceTransferExpert"].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { status, expertResponse } = body;

    // اعتبارسنجی ورودی‌ها
    if (!status || !expertResponse) {
      return NextResponse.json(
        { success: false, error: "وضعیت و پاسخ کارشناس الزامی است" },
        { status: 400 }
      );
    }

    if (!["under_review", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "وضعیت نامعتبر است" },
        { status: 400 }
      );
    }

    if (expertResponse.length < 10) {
      return NextResponse.json(
        { success: false, error: "پاسخ باید حداقل 10 کاراکتر باشد" },
        { status: 400 }
      );
    }

    // پیدا کردن درخواست
    const correctionRequest = await ProfileCorrectionRequest.findById(id);

    if (!correctionRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی به این درخواست خاص
    // کارشناس منطقه فقط درخواست‌های منطقه خود را می‌تواند پاسخ دهد
    // کارشناس استان درخواست‌های کل استان را می‌تواند پاسخ دهد
    if (userAuth.role === "districtTransferExpert") {
      // TODO: بررسی کد منطقه
      // فعلاً همه درخواست‌ها را قبول می‌کنیم
    } else if (userAuth.role === "provinceTransferExpert") {
      // TODO: بررسی کد استان
      // فعلاً همه درخواست‌ها را قبول می‌کنیم
    }

    // به‌روزرسانی درخواست
    correctionRequest.status = status;
    correctionRequest.expertResponse = expertResponse;
    correctionRequest.respondedBy = userAuth.id;
    correctionRequest.respondedAt = new Date();

    await correctionRequest.save();

    return NextResponse.json({
      success: true,
      message: "پاسخ با موفقیت ثبت شد",
      data: {
        id: correctionRequest._id.toString(),
        status: correctionRequest.status,
        expertResponse: correctionRequest.expertResponse,
        respondedAt: correctionRequest.respondedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in PUT /api/admin/profile-correction-requests/[id]/respond:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ثبت پاسخ",
      },
      { status: 500 }
    );
  }
}
