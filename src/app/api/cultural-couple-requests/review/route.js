import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import AppealRequest from "@/models/AppealRequest";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import User from "@/models/User";
import connectDB from "@/lib/db";

export async function POST(request) {
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

    const body = await request.json();
    const { requestId, opinion, description, decision } = body;

    // اعتبارسنجی ورودی
    if (!requestId || !decision) {
      return NextResponse.json(
        { success: false, error: "لطفاً تصمیم خود را انتخاب کنید" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "تصمیم نامعتبر است" },
        { status: 400 }
      );
    }

    // پیدا کردن درخواست
    const appealRequest = await AppealRequest.findById(requestId);
    if (!appealRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی به این درخواست خاص
    if (user.role === "districtTransferExpert") {
      // کارشناس امور اداری منطقه: فقط درخواست‌هایی که کد منطقه همسر با منطقه کاربر مطابقت دارد

      // دریافت کد منطقه کاربر
      let userDistrictCode = null;
      if (user.district) {
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

      if (appealRequest.culturalCoupleInfo?.districtCode !== userDistrictCode) {
        return NextResponse.json(
          { success: false, error: "شما به این درخواست دسترسی ندارید" },
          { status: 403 }
        );
      }
    } else if (user.role === "provinceTransferExpert") {
      // کارشناس امور اداری استان: بررسی اینکه درخواست مربوط به استان کاربر است

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

      if (
        !provinceCodes.includes(appealRequest.culturalCoupleInfo?.districtCode)
      ) {
        return NextResponse.json(
          { success: false, error: "شما به این درخواست دسترسی ندارید" },
          { status: 403 }
        );
      }
    }

    // به‌روزرسانی اطلاعات بررسی کارشناس
    appealRequest.culturalCoupleInfo.spouseDistrictDecision = decision;
    appealRequest.culturalCoupleInfo.spouseDistrictOpinion = opinion || "";
    appealRequest.culturalCoupleInfo.spouseDistrictDescription =
      description || "";

    // ثبت اطلاعات بررسی‌کننده
    appealRequest.reviewedBy = user._id;
    appealRequest.reviewedAt = new Date();
    appealRequest.reviewNotes = `تصمیم منطقه خدمت همسر: ${
      decision === "approve" ? "تایید" : "رد"
    }${opinion ? ` - ${opinion}` : ""}`;

    await appealRequest.save();

    // پیدا کردن TransferApplicantSpec مربوط به این کاربر و ثبت نظر در statusLog
    try {
      const transferApplicantSpec = await TransferApplicantSpec.findOne({
        $or: [
          { nationalId: appealRequest.nationalId },
          { personnelCode: appealRequest.personnelCode },
        ],
      });

      if (transferApplicantSpec) {
        // اضافه کردن log entry برای نظر کارشناس زوج فرهنگی
        transferApplicantSpec.addStatusLog({
          fromStatus: null, // این یک نظر جداگانه است، نه تغییر وضعیت
          toStatus: `cultural_couple_${decision}`, // cultural_couple_approve یا cultural_couple_reject
          actionType: decision === "approve" ? "approval" : "rejection",
          performedBy: user.userId,
          comment: `نظر کارشناس ${
            user.role === "districtTransferExpert"
              ? "امور اداری منطقه"
              : "امور اداری استان"
          } در مورد زوج فرهنگی: ${decision === "approve" ? "تایید" : "رد"}${
            opinion ? ` - ${opinion}` : ""
          }`,
          metadata: {
            reviewType: "cultural_couple",
            decision: decision,
            opinion: opinion || "",
            description: description || "",
            reviewerRole: user.role,
            culturalCoupleInfo: {
              spousePersonnelCode:
                appealRequest.culturalCoupleInfo?.personnelCode,
              spouseDistrictCode:
                appealRequest.culturalCoupleInfo?.districtCode,
              spouseDistrictName:
                appealRequest.culturalCoupleInfo?.districtName,
            },
          },
        });

        await transferApplicantSpec.save();
      }
    } catch (logError) {
      console.error(
        "Error adding status log for cultural couple review:",
        logError
      );
      // ادامه دهیم حتی اگر log ثبت نشود
    }

    return NextResponse.json({
      success: true,
      message: "نظر شما با موفقیت ثبت شد",
      data: {
        requestId: appealRequest._id,
        opinion,
        description,
        decision,
        reviewedAt: appealRequest.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت نظر" },
      { status: 500 }
    );
  }
}
