import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import District from "@/models/District";
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

    return NextResponse.json({
      success: true,
      districts: formattedDistricts,
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
        { value: "user_no_action", label: "عدم اقدام کاربر" },
        { value: "awaiting_user_approval", label: "در انتظار تایید کاربر" },
        { value: "user_approval", label: "تایید کاربر" },
        { value: "source_review", label: "در حال بررسی مبدا" },
        {
          value: "exception_eligibility_approval",
          label: "تایید مشمولیت استثنا",
        },
        {
          value: "exception_eligibility_rejection",
          label: "رد مشمولیت استثنا",
        },
        { value: "source_approval", label: "تایید مبدا" },
        { value: "source_rejection", label: "رد مبدا" },
        { value: "province_review", label: "در حال بررسی توسط استان" },
        { value: "province_approval", label: "تایید استان" },
        { value: "province_rejection", label: "رد استان" },
        // { value: "destination_review", label: "در حال بررسی مقصد" },
        { value: "destination_approval", label: "تایید مقصد" },
        { value: "destination_rejection", label: "رد مقصد" },
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
