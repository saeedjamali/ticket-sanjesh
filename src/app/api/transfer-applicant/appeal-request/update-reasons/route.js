import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import AppealRequest from "@/models/AppealRequest";
import TransferReason from "@/models/TransferReason";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";

export async function PUT(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کارشناسان
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

    // دریافت داده‌های ارسالی
    const { nationalId, selectedReasons } = await request.json();

    if (!nationalId) {
      return NextResponse.json(
        { success: false, error: "کد ملی الزامی است" },
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedReasons)) {
      return NextResponse.json(
        { success: false, error: "دلایل انتخابی باید آرایه باشد" },
        { status: 400 }
      );
    }

    // پیدا کردن درخواست تجدیدنظر بر اساس کد ملی
    const appealRequest = await AppealRequest.findOne({ nationalId });

    if (!appealRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست تجدیدنظر یافت نشد" },
        { status: 404 }
      );
    }

    // اعتبارسنجی دلایل انتخاب شده
    if (selectedReasons.length > 0) {
      const validReasons = await TransferReason.find({
        _id: { $in: selectedReasons },
        isActive: true,
      });

      if (validReasons.length !== selectedReasons.length) {
        return NextResponse.json(
          { success: false, error: "برخی از دلایل انتخاب شده نامعتبر هستند" },
          { status: 400 }
        );
      }

      // آماده‌سازی اطلاعات دلایل انتخاب شده
      const reasonsData = validReasons.map((reason) => ({
        reasonId: reason._id,
        reasonCode: reason.reasonCode,
        reasonTitle: reason.reasonTitle,
        title: reason.title,
        // حفظ اطلاعات بررسی قبلی در صورت وجود
        review: appealRequest.selectedReasons?.find(
          (sr) => sr.reasonId.toString() === reason._id.toString()
        )?.review || {
          status: "pending",
          reviewedBy: null,
          reviewedAt: null,
          expertComment: "",
          reviewerRole: null,
          reviewerLocationCode: null,
          metadata: {},
        },
      }));

      appealRequest.selectedReasons = reasonsData;
    } else {
      // اگر هیچ دلیلی انتخاب نشده، لیست را خالی کن
      appealRequest.selectedReasons = [];
    }

    // به‌روزرسانی وضعیت متقاضی به source_review
    const transferApplicantSpec = await TransferApplicantSpec.findOne({
      nationalId: nationalId,
    });

    if (transferApplicantSpec) {
      transferApplicantSpec.currentRequestStatus = "source_review";
      transferApplicantSpec.updatedAt = new Date();
      await transferApplicantSpec.save();
    }

    // ثبت تغییرات
    appealRequest.updatedAt = new Date();
    await appealRequest.save();

    // بازیابی مجدد با populate برای اطمینان از داده‌های به‌روز
    const updatedAppealRequest = await AppealRequest.findById(appealRequest._id)
      .populate("selectedReasons.reasonId", "title reasonTitle description")
      .lean();

    return NextResponse.json({
      success: true,
      message:
        "دلایل انتقال با موفقیت به‌روزرسانی شد و وضعیت متقاضی به 'در حال بررسی مبدا' تغییر یافت",
      data: {
        appealRequestId: updatedAppealRequest._id,
        nationalId: updatedAppealRequest.nationalId,
        selectedReasons: updatedAppealRequest.selectedReasons,
        updatedAt: updatedAppealRequest.updatedAt,
        newStatus: "source_review",
      },
    });
  } catch (error) {
    console.error("Error updating appeal request reasons:", error);
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی دلایل انتقال" },
      { status: 500 }
    );
  }
}
