import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import AppealRequest from "@/models/AppealRequest";
import User from "@/models/User";
import connectDB from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();

    // بررسی احراز هویت
    const user = await authService.validateToken(request);
    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت لازم است" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      user.role !== "districtTransferExpert" &&
      user.role !== "provinceTransferExpert"
    ) {
      return NextResponse.json(
        { success: false, error: "شما به این بخش دسترسی ندارید" },
        { status: 403 }
      );
    }

    let query = {};

    // فیلتر بر اساس نقش کاربر
    if (user.role === "districtTransferExpert") {
      // کارشناس امور اداری منطقه: فقط درخواست‌هایی که کد منطقه همسر با منطقه کاربر مطابقت دارد

      // دریافت کد منطقه کاربر
      let userDistrictCode = null;
      if (user.district) {
        // اگر district یک ObjectId است، اطلاعات آن را از دیتابیس بگیریم
        if (typeof user.district === "object" && user.district.code) {
          userDistrictCode = user.district.code;
        } else {
          const District = (await import("@/models/District")).default;
          const district = await District.findById(user.district)
            .select("code")
            .lean();
          if (district) {
            userDistrictCode = district.code;
          }
        }
      }

      if (!userDistrictCode) {
        return NextResponse.json(
          { success: false, error: "کد منطقه کاربر یافت نشد" },
          { status: 400 }
        );
      }

      query = {
        "culturalCoupleInfo.personnelCode": { $exists: true, $ne: "" },
        "culturalCoupleInfo.districtCode": userDistrictCode,
      };
    } else if (user.role === "provinceTransferExpert") {
      // کارشناس امور اداری استان: تمام درخواست‌های زوج فرهنگی استان

      // دریافت کد استان کاربر
      let userProvinceCode = null;
      if (user.province) {
        if (typeof user.province === "object" && user.province.code) {
          userProvinceCode = user.province.code;
        } else {
          const Province = (await import("@/models/Province")).default;
          const province = await Province.findById(user.province)
            .select("code")
            .lean();
          if (province) {
            userProvinceCode = province.code;
          }
        }
      }

      if (!userProvinceCode) {
        return NextResponse.json(
          { success: false, error: "کد استان کاربر یافت نشد" },
          { status: 400 }
        );
      }

      // پیدا کردن تمام مناطق این استان
      const District = (await import("@/models/District")).default;
      const Province = (await import("@/models/Province")).default;

      // ابتدا استان را پیدا کن
      const province = await Province.findOne({ code: userProvinceCode })
        .select("_id")
        .lean();
      if (!province) {
        return NextResponse.json(
          { success: false, error: "استان یافت نشد" },
          { status: 400 }
        );
      }

      const districtsInProvince = await District.find({
        province: province._id,
      })
        .select("code")
        .lean();

      const provinceCodes = districtsInProvince
        .map((d) => d.code)
        .filter(Boolean);

      query = {
        "culturalCoupleInfo.personnelCode": { $exists: true, $ne: "" },
        "culturalCoupleInfo.districtCode": { $in: provinceCodes },
      };
    }

    // دریافت درخواست‌ها
    const requests = await AppealRequest.find(query)
      .select({
        userId: 1,
        nationalId: 1,
        fullName: 1,
        phone: 1,
        personnelCode: 1,
        culturalCoupleInfo: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching cultural couple requests:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت درخواست‌ها" },
      { status: 500 }
    );
  }
}
