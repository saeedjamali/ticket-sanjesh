import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import { authService } from "@/lib/auth/authService";

// GET /api/personnel-stats - دریافت آمار وضعیت کاربران هم‌رشته و هم‌جنس
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران districtTransferExpert و provinceTransferExpert
    if (
      !["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const url = new URL(request.url);
    const personnelCode = url.searchParams.get("personnelCode");
    const districtCode = url.searchParams.get("districtCode");

    if (!personnelCode || !districtCode) {
      return NextResponse.json(
        { success: false, error: "کد پرسنلی و کد منطقه الزامی است" },
        { status: 400 }
      );
    }

    // یافتن اطلاعات کاربر مورد نظر
    const targetPersonnel = await TransferApplicantSpec.findOne({
      personnelCode: personnelCode,
    });

    if (!targetPersonnel) {
      return NextResponse.json(
        { success: false, error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // console.log("targetPersonnel----------->", targetPersonnel);
    const { fieldCode, gender, employmentField } = targetPersonnel;

    if (!fieldCode || !gender) {
      return NextResponse.json(
        { success: false, error: "اطلاعات رشته یا جنسیت کاربر ناقص است" },
        { status: 400 }
      );
    }

    // آمار وضعیت‌های کاربران هم‌رشته و هم‌جنس در همان منطقه
    const statusCounts = await TransferApplicantSpec.aggregate([
      {
        $match: {
          fieldCode: fieldCode,
          gender: gender,
          currentWorkPlaceCode: districtCode,
          currentRequestStatus: {
            $in: [
              "user_approval",
              "source_review",
              "exception_eligibility_approval",
              "source_approval",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$currentRequestStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // محاسبه کل کاربران هم‌رشته و هم‌جنس
    const totalSimilarPersonnel = await TransferApplicantSpec.countDocuments({
      fieldCode: fieldCode,
      gender: gender,
      currentWorkPlaceCode: districtCode,
      currentRequestStatus: {
        $in: [
          "user_approval",
          "source_review",
          "exception_eligibility_approval",
          "source_approval",
        ],
      },
    });

    // تبدیل نتایج به فرمت مناسب
    const stats = {
      user_approval: 0,
      source_review: 0,
      exception_eligibility_approval: 0,
      source_approval: 0,
    };

    statusCounts.forEach((item) => {
      if (stats.hasOwnProperty(item._id)) {
        stats[item._id] = item.count;
      }
    });
    console.log("statusCounts----------->", statusCounts);
    // محاسبه رتبه کاربر بر اساس approvedScore
    const rankResult = await TransferApplicantSpec.aggregate([
      {
        $match: {
          fieldCode: fieldCode,
          gender: gender,
          currentWorkPlaceCode: districtCode,
          currentRequestStatus: {
            $in: [
              "user_approval",
              "source_review",
              "exception_eligibility_approval",
              "source_approval",
            ],
          },
          approvedScore: { $exists: true, $ne: null },
        },
      },
      {
        $sort: { approvedScore: -1 }, // مرتب‌سازی نزولی
      },
      {
        $group: {
          _id: null,
          personnel: {
            $push: {
              personnelCode: "$personnelCode",
              approvedScore: "$approvedScore",
            },
          },
        },
      },
    ]);

    let userRank = null;
    let totalPersonnel = 0;

    if (rankResult.length > 0 && rankResult[0].personnel) {
      const personnel = rankResult[0].personnel;
      totalPersonnel = personnel.length;

      // پیدا کردن رتبه کاربر
      const userIndex = personnel.findIndex(
        (p) => p.personnelCode === personnelCode
      );
      if (userIndex !== -1) {
        userRank = userIndex + 1; // رتبه از 1 شروع می‌شود
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        personnelCode: personnelCode,
        fieldCode: fieldCode,
        employmentField: employmentField,
        gender: gender,
        currentWorkPlaceCode: districtCode,
        statusStats: stats,
        totalSimilarPersonnel: totalSimilarPersonnel,
        ranking: {
          rank: userRank,
          totalPersonnel: totalPersonnel,
          approvedScore: targetPersonnel.approvedScore,
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/personnel-stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت آمار کاربران",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
