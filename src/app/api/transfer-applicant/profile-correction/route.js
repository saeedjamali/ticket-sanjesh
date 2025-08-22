import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import { authService } from "@/lib/auth/authService";

// POST /api/transfer-applicant/profile-correction - ارسال درخواست اصلاح مشخصات
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

    // دریافت اطلاعات از درخواست
    const data = await request.json();
    const { disputedField, description, attachmentImage } = data;

    // اعتبارسنجی فیلدهای اجباری
    if (!disputedField || !description) {
      return NextResponse.json(
        { success: false, error: "فیلد مورد اعتراض و توضیحات الزامی است" },
        { status: 400 }
      );
    }

    // اعتبارسنجی طول توضیحات
    if (description.length < 10 || description.length > 1000) {
      return NextResponse.json(
        { success: false, error: "توضیحات باید بین 10 تا 1000 کاراکتر باشد" },
        { status: 400 }
      );
    }

    // دریافت مشخصات کاربر برای اطلاعات مکانی
    const userSpecs = await TransferApplicantSpec.findOne({
      nationalId: userAuth.nationalId,
    });

    if (!userSpecs) {
      return NextResponse.json(
        { success: false, error: "مشخصات کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // استخراج کد استان و منطقه از کد محل خدمت
    const currentWorkPlaceCode = userSpecs.currentWorkPlaceCode;
    if (!currentWorkPlaceCode || currentWorkPlaceCode.length < 4) {
      return NextResponse.json(
        { success: false, error: "کد محل خدمت نامعتبر است" },
        { status: 400 }
      );
    }

    // کد استان از دو رقم اول کد منطقه استخراج می‌شود
    const districtCode = currentWorkPlaceCode.substring(0, 4);
    const provinceCode = currentWorkPlaceCode.substring(0, 2);

    // بررسی اینکه آیا درخواست قبلی برای این کاربر و فیلد وجود دارد
    const existingRequest = await ProfileCorrectionRequest.findOne({
      userId: userAuth.id,
      disputedField,
      status: { $in: ["pending", "under_review"] },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "درخواست قبلی برای این فیلد در حال بررسی است",
        },
        { status: 400 }
      );
    }

    // ایجاد درخواست جدید
    const newRequest = new ProfileCorrectionRequest({
      userId: userAuth.id,
      nationalId: userAuth.nationalId,
      fullName: userAuth.fullName,
      phone: userAuth.phone,
      personnelCode: userAuth.personnelCode || userSpecs.personnelCode || null,
      provinceCode,
      districtCode,
      disputedField,
      description,
      attachmentImage: attachmentImage || null,
    });

    await newRequest.save();

    // اضافه کردن log به statusLog در transferapplicantspecs
    try {
      const TransferApplicantSpec = (
        await import("@/models/TransferApplicantSpec")
      ).default;

      const userSpecs = await TransferApplicantSpec.findOne({
        nationalId: userAuth.nationalId,
      });

      if (userSpecs) {
        // تغییر وضعیت درخواست با استفاده از workflow جدید
        userSpecs.changeRequestStatus({
          status: "awaiting_user_approval",
          changedBy: userAuth.id,
          reason: `درخواست اصلاح مشخصات برای فیلد: ${disputedField}`,
          metadata: {
            disputedField,
            description,
            correctionRequestId: newRequest._id.toString(),
            attachmentImage: attachmentImage || null,
            step: 2,
            actionType: "profile_correction_request",
          },
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
      message: "درخواست اصلاح مشخصات با موفقیت ارسال شد",
      request: {
        ...newRequest.toObject(),
        _id: newRequest._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in POST /api/transfer-applicant/profile-correction:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ارسال درخواست اصلاح مشخصات",
      },
      { status: 500 }
    );
  }
}
