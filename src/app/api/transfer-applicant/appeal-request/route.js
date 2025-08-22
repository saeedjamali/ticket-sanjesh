import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import AppealRequest from "@/models/AppealRequest";
import TransferReason from "@/models/TransferReason";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";

// POST /api/transfer-applicant/appeal-request - ذخیره درخواست تجدیدنظر
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
      uploadedDocuments,
      culturalCoupleInfo,
      yearsWarnings,
      currentStep,
      status = "draft",
      notes,
      userComments,
      userCommentsImages,
    } = body;

    // اعتبارسنجی ورودی‌ها
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

    // استخراج کد استان و منطقه از کد محل خدمت
    let districtCode = null;
    let provinceCode = null;

    if (
      userSpecs.currentWorkPlaceCode &&
      userSpecs.currentWorkPlaceCode.length >= 4
    ) {
      districtCode = userSpecs.currentWorkPlaceCode;
      provinceCode = userSpecs.currentWorkPlaceCode.substring(0, 2);
    }

    // دریافت سال تحصیلی فعال از جدول
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true });

    if (!activeAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی فعال یافت نشد" },
        { status: 404 }
      );
    }

    const academicYear = activeAcademicYear.name;

    // اعتبارسنجی دلایل انتخاب شده
    const reasonIds = selectedReasons.map((id) => id);
    const validReasons = await TransferReason.find({
      _id: { $in: reasonIds },
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
    }));

    // اعتبارسنجی و تکمیل اطلاعات زوج فرهنگی
    let culturalCoupleData = null;
    if (
      culturalCoupleInfo &&
      culturalCoupleInfo.personnelCode &&
      culturalCoupleInfo.districtCode
    ) {
      // اعتبارسنجی کد پرسنلی همسر
      if (culturalCoupleInfo.personnelCode.length !== 8) {
        return NextResponse.json(
          { success: false, error: "کد پرسنلی همسر باید 8 رقمی باشد" },
          { status: 400 }
        );
      }

      // دریافت نام منطقه
      const district = await District.findOne({
        code: culturalCoupleInfo.districtCode,
      });

      culturalCoupleData = {
        personnelCode: culturalCoupleInfo.personnelCode,
        districtCode: culturalCoupleInfo.districtCode,
        districtName: district?.name || "",
      };
    }

    // بررسی وجود درخواست قبلی برای این کاربر
    const existingRequest = await AppealRequest.findOne({
      userId: userAuth.id,
      status: { $in: ["draft", "submitted"] },
    });

    let appealRequest;

    if (existingRequest) {
      // به‌روزرسانی درخواست موجود
      existingRequest.selectedReasons = reasonsData;
      existingRequest.uploadedDocuments = new Map(
        Object.entries(uploadedDocuments || {})
      );
      existingRequest.culturalCoupleInfo = culturalCoupleData;
      existingRequest.yearsWarnings = yearsWarnings || [];
      existingRequest.currentStep = currentStep || 3;
      existingRequest.status = status;
      existingRequest.notes = notes;
      existingRequest.userComments = userComments;
      existingRequest.userCommentsImages = userCommentsImages || [];
      existingRequest.personnelCode =
        userAuth.personnelCode || userSpecs.personnelCode || null;
      existingRequest.districtCode = districtCode;
      existingRequest.provinceCode = provinceCode;
      existingRequest.academicYear = academicYear;

      appealRequest = await existingRequest.save();
    } else {
      // ایجاد درخواست جدید
      appealRequest = new AppealRequest({
        userId: userAuth.id,
        nationalId: userAuth.nationalId,
        fullName: userAuth.fullName,
        phone: userAuth.phone,
        personnelCode:
          userAuth.personnelCode || userSpecs.personnelCode || null,
        districtCode: districtCode,
        provinceCode: provinceCode,
        academicYear: academicYear,
        selectedReasons: reasonsData,
        uploadedDocuments: new Map(Object.entries(uploadedDocuments || {})),
        culturalCoupleInfo: culturalCoupleData,
        yearsWarnings: yearsWarnings || [],
        currentStep: currentStep || 3,
        status: status,
        notes: notes,
        userComments: userComments,
        userCommentsImages: userCommentsImages || [],
      });

      appealRequest = await appealRequest.save();
    }

    // اگر وضعیت submitted باشد، تاریخ ارسال را ثبت کن
    if (status === "submitted") {
      appealRequest.submittedAt = new Date();
      await appealRequest.save();
    }

    // اضافه کردن log به statusLog در transferapplicantspecs
    try {
      const TransferApplicantSpec = (
        await import("@/models/TransferApplicantSpec")
      ).default;

      const userSpecs = await TransferApplicantSpec.findOne({
        nationalId: userAuth.nationalId,
      });

      if (userSpecs) {
        const actionType = existingRequest ? "updated" : "created";

        // آماده‌سازی metadata
        const metadata = {
          appealRequestId: appealRequest._id.toString(),
          selectedReasonsCount: selectedReasons ? selectedReasons.length : 0,
          selectedReasons: selectedReasons
            ? selectedReasons.map((r) => ({
                reasonId: r.reasonId,
                reasonCode: r.reasonCode,
                reasonTitle: r.reasonTitle,
              }))
            : [],
          uploadedDocumentsCount: uploadedDocuments
            ? Object.keys(uploadedDocuments).length
            : 0,
          hasCulturalCoupleInfo:
            culturalCoupleData &&
            (culturalCoupleData.personnelCode ||
              culturalCoupleData.districtCode),
          yearsWarningsCount: yearsWarnings ? yearsWarnings.length : 0,
          currentStep: currentStep || 3,
          academicYear: academicYear,
          districtCode: districtCode,
          provinceCode: provinceCode,
          step: 3,
          actionType:
            status === "submitted"
              ? "appeal_request_submission"
              : "appeal_request_draft_save",
        };

        // تغییر وضعیت درخواست با استفاده از workflow جدید
        userSpecs.changeRequestStatus({
          status: "awaiting_user_approval",
          changedBy: userAuth.id,
          reason:
            status === "submitted"
              ? `ثبت نهایی درخواست تجدیدنظر با ${
                  selectedReasons ? selectedReasons.length : 0
                } بند انتخابی`
              : `ذخیره پیش‌نویس درخواست تجدیدنظر`,
          metadata: metadata,
          userAgent: request.headers.get("user-agent") || "",
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "",
        });

        await userSpecs.save();
      }
    } catch (logError) {
      console.error("Error adding status log:", logError);
      // ادامه می‌دهیم حتی اگر log ثبت نشود
    }

    return NextResponse.json({
      success: true,
      message:
        status === "submitted"
          ? "درخواست تجدیدنظر با موفقیت ارسال شد"
          : "درخواست تجدیدنظر ذخیره شد",
      appealRequest: {
        _id: appealRequest._id.toString(),
        status: appealRequest.status,
        currentStep: appealRequest.currentStep,
        createdAt: appealRequest.createdAt,
        submittedAt: appealRequest.submittedAt,
      },
    });
  } catch (error) {
    console.error(
      "Error in POST /api/transfer-applicant/appeal-request:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ذخیره درخواست تجدیدنظر",
      },
      { status: 500 }
    );
  }
}

// GET /api/transfer-applicant/appeal-request - دریافت درخواست‌های تجدیدنظر کاربر
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

    // دریافت درخواست‌های کاربر
    const appealRequests = await AppealRequest.find({
      userId: userAuth.id,
    })
      .populate("selectedReasons.reasonId", "title reasonTitle description")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      appealRequests: appealRequests.map((request) => ({
        _id: request._id.toString(),
        nationalId: request.nationalId,
        fullName: request.fullName,
        phone: request.phone,
        personnelCode: request.personnelCode,
        districtCode: request.districtCode,
        provinceCode: request.provinceCode,
        academicYear: request.academicYear,
        status: request.status,
        currentStep: request.currentStep,
        selectedReasons: request.selectedReasons,
        uploadedDocuments: Object.fromEntries(
          request.uploadedDocuments || new Map()
        ),
        culturalCoupleInfo: request.culturalCoupleInfo,
        yearsWarnings: request.yearsWarnings,
        createdAt: request.createdAt,
        submittedAt: request.submittedAt,
        notes: request.notes,
        userComments: request.userComments,
        userCommentsImages: request.userCommentsImages,
      })),
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-applicant/appeal-request:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت درخواست‌های تجدیدنظر",
      },
      { status: 500 }
    );
  }
}
