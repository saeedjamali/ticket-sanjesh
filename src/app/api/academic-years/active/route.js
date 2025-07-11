import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";

// GET - دریافت سال تحصیلی فعال (بدون احراز هویت - عمومی)
export async function GET(request) {
  try {
    await dbConnect();

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true })
      .select("name")
      .lean();

    console.log("Academic year API - Found:", activeAcademicYear?.name);

    return NextResponse.json({
      success: true,
      activeAcademicYear: activeAcademicYear?.name || null,
    });
  } catch (error) {
    console.error("Error fetching active academic year:", error);
    return NextResponse.json(
      { error: "خطا در دریافت سال تحصیلی فعال" },
      { status: 500 }
    );
  }
}
 