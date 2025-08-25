import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import { authService } from "@/lib/auth/authService";

// POST /api/source-opinion - ثبت نظر مبدا (موافقت یا مخالفت با انتقال)
export async function POST(request) {
  try {
    const user = await authService.validateToken(request);

    if (
      !user ||
      !["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "دسترسی محدود - تنها کارشناسان مجاز هستند" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { personnelCode, action, reasonIds, comment } = body; // action: 'approve' یا 'reject'

    // اعتبارسنجی ورودی‌ها
    if (!personnelCode || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "کد پرسنلی و نوع تصمیم الزامی است" },
        { status: 400 }
      );
    }

    if (!reasonIds || !Array.isArray(reasonIds) || reasonIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "انتخاب حداقل یک دلیل الزامی است" },
        { status: 400 }
      );
    }

    // یافتن شخص در دیتابیس
    const transferApplicantSpec = await TransferApplicantSpec.findOne({
      personnelCode: personnelCode,
    });

    if (!transferApplicantSpec) {
      return NextResponse.json(
        { success: false, error: "پرسنل مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وضعیت فعلی - باید exception_eligibility_approval یا province_approval باشد
    const validStatuses = [
      "exception_eligibility_approval",
      "province_approval",
    ];
    if (!validStatuses.includes(transferApplicantSpec.currentRequestStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `این عملیات تنها برای پرسنل با وضعیت ${validStatuses.join(
            " یا "
          )} امکان‌پذیر است`,
        },
        { status: 400 }
      );
    }

    const currentTime = new Date();
    const previousStatus = transferApplicantSpec.currentRequestStatus;

    // تعیین وضعیت جدید
    const newStatus =
      action === "approve" ? "source_approval" : "source_rejection";

    // به‌روزرسانی وضعیت در TransferApplicantSpec
    transferApplicantSpec.currentRequestStatus = newStatus;

    // افزودن به requestStatusWorkflow
    if (!transferApplicantSpec.requestStatusWorkflow) {
      transferApplicantSpec.requestStatusWorkflow = [];
    }

    transferApplicantSpec.requestStatusWorkflow.push({
      status: newStatus,
      changedBy: user.userId,
      changedAt: currentTime,
      previousStatus: previousStatus,
      reason:
        action === "approve"
          ? "موافقت مبدا با انتقال"
          : "مخالفت مبدا با انتقال",
      metadata: {
        reviewType: "source_opinion",
        reviewerRole: user.role,
        action: action,
        selectedReasonIds: reasonIds,
        comment: comment || "",
        finalDecision: true,
      },
    });

    // افزودن به statusLog
    transferApplicantSpec.statusLog.push({
      fromStatus: previousStatus,
      toStatus: newStatus,
      actionType: action === "approve" ? "approval" : "rejection",
      performedBy: new mongoose.Types.ObjectId(user.userId),
      performedAt: currentTime,
      comment: `${
        action === "approve" ? "موافقت" : "مخالفت"
      } مبدا با انتقال توسط ${
        user.role === "districtTransferExpert"
          ? "کارشناس منطقه"
          : "کارشناس استان"
      }${comment ? ` - ${comment}` : ""}`,
      metadata: {
        reviewType: "source_opinion",
        selectedReasonIds: reasonIds,
        userComment: comment || "",
        finalDecision: true,
      },
    });

    await transferApplicantSpec.save();

    console.log(
      `Source opinion recorded for personnel: ${personnelCode} - Action: ${action} - New Status: ${newStatus}`
    );

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "موافقت با انتقال ثبت شد"
          : "مخالفت با انتقال ثبت شد",
      data: {
        personnelCode: personnelCode,
        previousStatus: previousStatus,
        newStatus: newStatus,
        action: action,
        reasonIds: reasonIds,
        comment: comment,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/source-opinion:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت نظر مبدا" },
      { status: 500 }
    );
  }
}




