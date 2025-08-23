import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// دریافت آمار وضعیت‌ها برای export Excel
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // فقط کارشناس استان دسترسی دارد
    if (userAuth.role !== ROLES.PROVINCE_TRANSFER_EXPERT) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی - فقط کارشناس استان" },
        { status: 403 }
      );
    }

    await connectDB();

    // دیباگ: بررسی اطلاعات کاربر
    console.log("Full userAuth:", userAuth);

    // دیباگ: بررسی تمام مناطق
    const allDistricts = await District.find({}).select(
      "code name provinceCode"
    );
    console.log("All districts in DB:", allDistricts.slice(0, 5));

    // ابتدا باید مناطق مربوط به استان را پیدا کنم
    const districtsInProvince = await District.find({
      provinceCode: userAuth.province,
    }).select("code name provinceCode");

    const districtCodes = districtsInProvince.map((d) => d.code);
    console.log("User Province:", userAuth.province);
    console.log("Districts in province:", districtsInProvince);
    console.log("District codes:", districtCodes);

    // دیباگ: بررسی تمام رکوردها
    const allSpecs = await TransferApplicantSpec.find({})
      .select("currentWorkPlaceCode currentRequestStatus")
      .limit(5);
    console.log("Sample of all specs in DB:", allSpecs);

    // گرفتن همه رکوردهای مناطق این استان
    const specs = await TransferApplicantSpec.find({
      currentWorkPlaceCode: { $in: districtCodes },
    }).select("currentWorkPlaceCode currentRequestStatus");

    console.log("Found specs count:", specs.length);
    console.log("Sample specs:", specs.slice(0, 3));

    // اگر هیچ رکوردی نیست، تمام رکوردها را امتحان کن
    if (specs.length === 0) {
      console.log("No specs found with district filter, trying all specs...");
      const allSpecsForTest = await TransferApplicantSpec.find({})
        .select("currentWorkPlaceCode currentRequestStatus")
        .limit(10);
      console.log("All specs for test:", allSpecsForTest);
    }

    // اگر هیچ رکوردی پیدا نشد، از تمام داده‌ها استفاده کن (موقت برای تست)
    let finalSpecs = specs;
    if (specs.length === 0) {
      console.log("Using all specs for statistics (temporary for testing)");
      finalSpecs = await TransferApplicantSpec.find({}).select(
        "currentWorkPlaceCode currentRequestStatus"
      );
    }

    // تعریف تمام وضعیت‌های ممکن (بجای استخراج از داده‌ها)
    const allPossibleStatuses = [
      "user_no_action",
      "awaiting_user_approval",
      "user_approval",
      "source_review",
      "exception_eligibility_approval",
      "exception_eligibility_rejection",
      "source_approval",
      "source_rejection",
      "province_review",
      "province_approval",
      "province_rejection",
      "destination_review",
      "destination_approval",
      "destination_rejection",
    ];

    // گرفتن وضعیت‌هایی که واقعاً در داده‌ها موجود هستند
    const existingStatuses = [
      ...new Set(
        finalSpecs.map((spec) => spec.currentRequestStatus).filter(Boolean)
      ),
    ];

    console.log("Existing statuses in data:", existingStatuses);

    // استفاده از تمام وضعیت‌های ممکن
    const allStatuses = allPossibleStatuses;

    // گرفتن تمام کدهای محل کار منحصر به فرد
    const allWorkPlaceCodes = [
      ...new Set(
        finalSpecs.map((spec) => spec.currentWorkPlaceCode).filter(Boolean)
      ),
    ];

    console.log("All Statuses:", allStatuses);
    console.log("All WorkPlace Codes:", allWorkPlaceCodes);

    // گرفتن اطلاعات مناطق برای نام‌های فارسی
    const districts = await District.find({
      code: { $in: allWorkPlaceCodes },
    }).select("code name");

    // ایجاد نقشه کد به نام منطقه
    const districtMap = {};
    districts.forEach((district) => {
      districtMap[district.code] = district.name;
    });

    // ایجاد ماتریس آمار با کد و نام جداگانه
    const statistics = {};
    const workPlaceData = [];

    allWorkPlaceCodes.forEach((workPlaceCode) => {
      const districtName = districtMap[workPlaceCode] || "نامشخص";

      // ذخیره اطلاعات کد و نام جداگانه
      const districtInfo = {
        code: workPlaceCode,
        name: districtName,
      };
      workPlaceData.push(districtInfo);

      // آمار برای این منطقه
      statistics[workPlaceCode] = {};
      allStatuses.forEach((status) => {
        // شمارش تعداد برای هر ترکیب workPlaceCode و status
        const count = finalSpecs.filter(
          (spec) =>
            spec.currentWorkPlaceCode === workPlaceCode &&
            spec.currentRequestStatus === status
        ).length;
        statistics[workPlaceCode][status] = count;
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        statuses: allStatuses,
        workPlaceData: workPlaceData,
      },
    });
  } catch (error) {
    console.error("خطا در دریافت آمار:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور داخلی" },
      { status: 500 }
    );
  }
}
