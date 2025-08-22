import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";

// GET /api/transfer-applicant/districts - دریافت لیست مناطق
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

    // دریافت لیست مناطق فعال همراه با اطلاعات استان
    const districts = await District.find({
      isActive: true,
    })
      .populate("province", "name code")
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      districts: districts.map((district) => ({
        _id: district._id.toString(),
        name: district.name,
        code: district.code,
        province: {
          name: district.province?.name || "",
          code: district.province?.code || "",
        },
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/transfer-applicant/districts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت لیست مناطق",
      },
      { status: 500 }
    );
  }
}


