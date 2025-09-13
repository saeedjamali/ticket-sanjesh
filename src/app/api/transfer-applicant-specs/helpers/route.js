import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import District from "@/models/District";
import EmploymentField from "@/models/EmploymentField";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![
        ROLES.SYSTEM_ADMIN,
        ROLES.PROVINCE_TRANSFER_EXPERT,
        ROLES.DISTRICT_TRANSFER_EXPERT,
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت همه مناطق مرتب براساس کد
    const districts = await District.find()
      .populate("province", "name code")
      .select("name code province")
      .sort({ code: 1 })
      .lean();

    // تبدیل ObjectId ها به string
    const formattedDistricts = districts.map((district) => ({
      ...district,
      _id: district._id.toString(),
      province: district.province
        ? {
            ...district.province,
            _id: district.province._id.toString(),
          }
        : null,
    }));

    // دریافت رشته‌های استخدامی فعال
    const employmentFields = await EmploymentField.find({ isActive: true })
      .select("fieldCode title")
      .sort({ fieldCode: 1 })
      .lean();

    const formattedEmploymentFields = employmentFields.map((field) => ({
      fieldCode: field.fieldCode,
      title: field.title,
      displayName: `${field.fieldCode} - ${field.title}`,
    }));

    return NextResponse.json({
      success: true,
      districts: formattedDistricts,
      employmentFields: formattedEmploymentFields,
      employmentTypes: [
        { value: "official", label: "رسمی" },
        { value: "contractual", label: "پیمانی" },
        { value: "adjunct", label: "حق التدریس" },
        { value: "contract", label: "قراردادی" },
        { value: "trial", label: "آزمایشی" },
      ],
      genders: [
        { value: "male", label: "مرد" },
        { value: "female", label: "زن" },
      ],
      transferTypes: [
        { value: "temporary", label: "موقت" },
        { value: "permanent", label: "دائم" },
      ],
      destinationTransferTypes: [
        { value: "permanent_preferred", label: "دائم یا موقت با اولویت دائم" },
        { value: "permanent_only", label: "فقط دائم" },
        { value: "temporary_only", label: "فقط موقت" },
      ],
      finalDestinationTransferTypes: [
        { value: "permanent", label: "دائم" },
        { value: "temporary", label: "موقت" },
      ],
      currentTransferStatuses: [
        { value: 1, label: "منتقل نشده در پردازش" },
        { value: 2, label: "منتقل شده پردازشی" },
        { value: 3, label: "ثبت نام ناقص" },
        { value: 4, label: "رد درخواست توسط منطقه مبدا" },
      ],
     
      requestStatuses: [
        { value: "user_no_action", label: "فاقد درخواست تجدیدنظر" },
        { value: "awaiting_user_approval", label: "درخواست ناقص (منتظر تایید کاربر)" },
        { value: "user_approval", label: "در انتظار بررسی مبدأ" },
        { value: "source_review", label: " درحال بررسی مشمولیت" },
        {
          value: "exception_eligibility_approval",
          label: "تایید مشمولیت، نظر مبدأ نامشخص",
        },
        {
          value: "exception_eligibility_rejection",
          label: "رد مشمولیت (فاقد شرایط)",
          label: "فاقد شرایط (عدم احراز مشمولیت)",
        },
        { value: "source_approval", label: "موافقت مبدا (موقت/دائم)" },
        { value: "source_rejection", label: "مخالفت مبدا (علیرغم مشمولیت)" },
        { value: "province_review", label: "در حال بررسی توسط استان" },
        // { value: "province_approval", label: "موافقت استان" },
        // { value: "province_rejection", label: "مخالفت استان" },
        // // { value: "destination_review", label: "در حال بررسی مقصد" },
        // { value: "destination_approval", label: "موافقت مقصد" },
        // { value: "destination_rejection", label: "مخالفت مقصد" },
        { value: "temporary_transfer_approved", label: "موافقت با انتقال موقت" },
        { value: "permanent_transfer_approved", label: "موافقت با انتقال دائم" },
        { value: "destination_correction_approved", label: "موافقت با اصلاح مقصد" },
        { value: "processing_stage_results", label: "مطابق نتایج مرحله پردازشی" },
        { value: "invalid_request", label: "درخواست نامعتبر است" },
      ],
      medicalCommissionCodes: [
        {
          value: 1,
          label:
            "کد 1د: انتقال به نزدیکترین محل مورد تقاضا بصورت دائم ضرورت دارد",
        },
        {
          value: 11,
          label:
            "کد 1م: انتقال به نزدیکترین محل مورد تقاضا بصورت موقت ضرورت دارد",
        },
        {
          value: 2,
          label:
            "کد 2م: انتقال به شهر مشهد (یکی از نواحی هفتگانه) بصورت موقت ضرورت دارد",
        },
        {
          value: 22,
          label:
            "کد 2د: انتقال به شهر مشهد (یکی از نواحی هفتگانه) بصورت دائم ضرورت دارد",
        },
        {
          value: 3,
          label: "کد 3م: انتقال به شهرستان های مرکز قطب بصورت موقت ضرورت دارد",
        },
        {
          value: 33,
          label: "کد 3د: انتقال به شهرستان های مرکز قطب بصورت دائم ضرورت دارد.",
        },
        { value: 4, label: "کد 4: انتقال ضرورت ندارد لکن قابل مساعدت است" },
        {
          value: 5,
          label: "کد 5: متقاضی واجد شرایط رای موثر برای انتقال نیست",
        },
      ],
    });
  } catch (error) {
    console.error("Error in GET /api/transfer-applicant-specs/helpers:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات کمکی" },
      { status: 500 }
    );
  }
}
