import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import TransferReason from "@/models/TransferReason";
import ClauseCondition from "@/models/ClauseCondition";
import { authService } from "@/lib/auth/authService";

// GET /api/clause-conditions/helpers - دریافت داده‌های کمکی برای شرایط بندها
export async function GET(request) {
  try {
    console.log("🛠️ GET /api/clause-conditions/helpers called");
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      console.log("❌ Authentication failed in helpers");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated in helpers:", user.role);
    await connectDB();

    // دریافت لیست بندهای فعال
    const transferReasons = await TransferReason.find({ isActive: true })
      .select("title clauseType description")
      .sort({ title: 1 })
      .lean();

    // دریافت انواع شرایط
    const conditionTypes = [
      { value: "approval", label: "موافقت", color: "green" },
      { value: "rejection", label: "مخالفت", color: "red" },
    ];

    // دریافت سطوح اهمیت
    const importanceLevels = [
      { value: "low", label: "کم", color: "gray" },
      { value: "medium", label: "متوسط", color: "blue" },
      { value: "high", label: "زیاد", color: "orange" },
      { value: "critical", label: "بحرانی", color: "red" },
    ];

    // آمار کلی
    const totalConditions = await ClauseCondition.countDocuments();
    const activeConditions = await ClauseCondition.countDocuments({
      isActive: true,
    });
    const approvalConditions = await ClauseCondition.countDocuments({
      conditionType: "approval",
      isActive: true,
    });
    const rejectionConditions = await ClauseCondition.countDocuments({
      conditionType: "rejection",
      isActive: true,
    });

    console.log("📊 Statistics calculated:", {
      total: totalConditions,
      active: activeConditions,
      approval: approvalConditions,
      rejection: rejectionConditions,
    });

    const statistics = {
      total: totalConditions,
      active: activeConditions,
      inactive: totalConditions - activeConditions,
      approval: approvalConditions,
      rejection: rejectionConditions,
    };

    return NextResponse.json({
      success: true,
      data: {
        transferReasons,
        conditionTypes,
        importanceLevels,
        statistics,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/clause-conditions/helpers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت داده‌های کمکی",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
