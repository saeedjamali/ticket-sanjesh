import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import EmploymentField from "@/models/EmploymentField";
import { authService } from "@/lib/auth/authService";
import dbConnect from "@/lib/dbConnect";

// GET /api/personnel-list - دریافت لیست کاربران هم‌رشته و هم‌جنس
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

    await dbConnect();

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

    const { fieldCode, gender } = targetPersonnel;

    if (!fieldCode || !gender) {
      return NextResponse.json(
        { success: false, error: "اطلاعات رشته یا جنسیت کاربر ناقص است" },
        { status: 400 }
      );
    }

    // بررسی اینکه آیا این رشته استخدامی مشترک است یا نه
    const employmentFieldInfo = await EmploymentField.findOne({
      fieldCode: fieldCode,
      isActive: true,
    });

    const isSharedField = employmentFieldInfo?.isShared || false;

    // تعریف query برای جستجوی کاربران هم‌رشته
    const matchQuery = {
      fieldCode: fieldCode,
      currentWorkPlaceCode: districtCode,
      currentRequestStatus: {
        $in: [
          "user_approval",
          "source_review",
          "exception_eligibility_approval",
          "source_approval",
        ],
      },
    };

    // اگر رشته مشترک نیست، جنسیت را هم در نظر بگیر
    if (!isSharedField) {
      matchQuery.gender = gender;
    }

    // دریافت لیست کاربران هم‌رشته مرتب شده براساس امتیاز (نزولی)
    const personnelList = await TransferApplicantSpec.find(matchQuery)
      .select(
        "firstName lastName personnelCode currentRequestStatus approvedScore gender"
      )
      .sort({ approvedScore: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        targetPersonnel: {
          personnelCode: targetPersonnel.personnelCode,
          fieldCode: fieldCode,
          gender: gender,
          isSharedField: isSharedField,
          currentWorkPlaceCode: districtCode,
        },
        personnelList: personnelList,
        totalCount: personnelList.length,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/personnel-list:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت لیست کاربران",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
