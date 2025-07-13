import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";

// GET - دریافت سال تحصیلی فعال (بدون احراز هویت - عمومی)
export async function GET(request) {
  try {
    await dbConnect();

    // بررسی درخواست سال قبل
    const { searchParams } = new URL(request.url);
    const wantPrevious = searchParams.get("previous") === "true";

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true })
      .select("name")
      .lean();

    if (!activeAcademicYear) {
      return NextResponse.json(
        { error: "سال تحصیلی فعال یافت نشد" },
        { status: 404 }
      );
    }

    // اگر سال قبل درخواست شده باشد
    if (wantPrevious) {
      const previousYear = await AcademicYear.findOne({
        name: { $lt: activeAcademicYear.name },
      })
        .sort({ name: -1 })
        .select("name")
        .lean();

      if (!previousYear) {
        return NextResponse.json(
          { error: "سال تحصیلی قبل یافت نشد" },
          { status: 404 }
        );
      }

      return NextResponse.json(previousYear);
    }

    return NextResponse.json(activeAcademicYear);
  } catch (error) {
    console.error("Error fetching active academic year:", error);
    return NextResponse.json(
      { error: "خطا در دریافت سال تحصیلی فعال" },
      { status: 500 }
    );
  }
}
