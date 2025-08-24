import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import AppealRequest from "@/models/AppealRequest";
import { authService } from "@/lib/auth/authService";

// POST /api/transfer-applicant/final-submission - تایید و ارسال نهایی درخواست
export async function POST(request) {
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

    const body = await request.json();
    const {
      selectedReasons,
      culturalCoupleInfo,
      destinationPriorities,
      yearsWarnings,
      uploadedDocuments,
      finalConfirmation,
    } = body;

    // اعتبارسنجی ورودی‌ها
    if (!finalConfirmation) {
      return NextResponse.json(
        { success: false, error: "تایید نهایی الزامی است" },
        { status: 400 }
      );
    }

    if (!selectedReasons || selectedReasons.length === 0) {
      return NextResponse.json(
        { success: false, error: "حداقل یک دلیل انتقال باید انتخاب شود" },
        { status: 400 }
      );
    }

    // دریافت اطلاعات کاربر
    const userSpecs = await TransferApplicantSpec.findOne({
      nationalId: userAuth.nationalId,
    });

    if (!userSpecs) {
      return NextResponse.json(
        { success: false, error: "اطلاعات کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود درخواست تجدیدنظر
    const existingAppealRequest = await AppealRequest.findOne({
      userId: userAuth.id,
      status: { $in: ["draft", "submitted"] },
    });

    if (!existingAppealRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست تجدیدنظر یافت نشد" },
        { status: 404 }
      );
    }

    // به‌روزرسانی وضعیت درخواست تجدیدنظر
    existingAppealRequest.status = "submitted";
    existingAppealRequest.submittedAt = new Date();
    await existingAppealRequest.save();

    // تغییر وضعیت در TransferApplicantSpec به user_approval
    userSpecs.changeRequestStatus({
      status: "user_approval",
      changedBy: userAuth.id,
      reason: "تایید نهایی و ارسال درخواست تجدیدنظر در نتیجه انتقال ",
      metadata: {
        appealRequestId: existingAppealRequest._id.toString(),
        selectedReasonsCount: selectedReasons.length,
        destinationPrioritiesCount: destinationPriorities.length,
        hasCulturalCoupleInfo:
          culturalCoupleInfo && culturalCoupleInfo.personnelCode,
        yearsWarningsCount: yearsWarnings.length,
        uploadedDocumentsCount: Object.keys(uploadedDocuments || {}).length,
        finalConfirmation: true,
        step: 6,
        actionType: "final_submission",
        submissionTimestamp: new Date().toISOString(),
      },
      userAgent: request.headers.get("user-agent") || "",
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "",
    });

    await userSpecs.save();

    return NextResponse.json({
      success: true,
      message: "درخواست تجدیدنظر در نتیجه انتقال  با موفقیت ثبت و ارسال شد",
      data: {
        appealRequestId: existingAppealRequest._id.toString(),
        currentStatus: userSpecs.currentRequestStatus,
        submittedAt: existingAppealRequest.submittedAt,
        workflowSteps: userSpecs.requestStatusWorkflow.length,
      },
    });
  } catch (error) {
    console.error(
      "Error in POST /api/transfer-applicant/final-submission:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ارسال نهایی درخواست",
      },
      { status: 500 }
    );
  }
}
