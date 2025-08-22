import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";

// GET /api/transfer-applicant/profile-specs - دریافت مشخصات کاربر از جدول transferapplicantspecs
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

    // دریافت مشخصات کاربر براساس کد ملی
    const userSpecs = await TransferApplicantSpec.findOne({
      nationalId: userAuth.nationalId,
    }).lean();

    if (!userSpecs) {
      return NextResponse.json(
        {
          success: false,
          error: "مشخصات کاربر یافت نشد. لطفاً با پشتیبانی تماس بگیرید.",
        },
        { status: 404 }
      );
    }

    // دریافت نام منطقه براساس کد منطقه
    let districtName = "";
    if (userSpecs.sourceDistrictCode) {
      const district = await District.findOne({
        code: userSpecs.sourceDistrictCode,
      }).lean();
      if (district) {
        districtName = district.name;
      }
    }

    // تبدیل ObjectId به string
    const formattedSpecs = {
      ...userSpecs,
      _id: userSpecs._id.toString(),
      districtName: districtName,
    };

    return NextResponse.json({
      success: true,
      specs: formattedSpecs,
    });
  } catch (error) {
    console.error("Error in GET /api/transfer-applicant/profile-specs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت مشخصات کاربر",
      },
      { status: 500 }
    );
  }
}
