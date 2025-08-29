import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import ClauseCondition from "@/models/ClauseCondition";
import User from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { authService } from "@/lib/auth/authService";

export async function POST(request) {
  try {
    await dbConnect();

    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی (کارشناسان انتقال منطقه و استان)
    const allowedRoles = ["districtTransferExpert", "provinceTransferExpert"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "دسترسی غیرمجاز - نقش کاربری نامعتبر" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { selectedClauses, conditionType } = body;

    // اعتبارسنجی ورودی
    if (
      !selectedClauses ||
      !Array.isArray(selectedClauses) ||
      selectedClauses.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "بندهای انتخابی الزامی است" },
        { status: 400 }
      );
    }

    if (!conditionType || !["approval", "rejection"].includes(conditionType)) {
      return NextResponse.json(
        { success: false, error: "نوع شرط نامعتبر است" },
        { status: 400 }
      );
    }

    // یافتن شرایطی که شامل هر یک از بندهای انتخابی باشند

    const conditions = await ClauseCondition.find({
      isActive: true,
      conditionType: conditionType,
      "relatedClauses.clauseId": { $in: selectedClauses },
    })
      .populate("relatedClauses.clauseId", "title code")
      .populate("createdBy", "fullName")
      .select(
        "conditionId title description conditionType relatedClauses importanceLevel validFrom validUntil createdBy createdAt"
      )
      .sort({ importanceLevel: -1, createdAt: -1 });

    // گروه‌بندی شرایط بر اساس اولویت
    const groupedConditions = {
      critical: conditions.filter((c) => c.importanceLevel === "critical"),
      high: conditions.filter((c) => c.importanceLevel === "high"),
      medium: conditions.filter((c) => c.importanceLevel === "medium"),
      low: conditions.filter((c) => c.importanceLevel === "low"),
    };

    return NextResponse.json({
      success: true,
      data: {
        conditions,
        groupedConditions,
        totalConditions: conditions.length,
        conditionType,
        selectedClauses,
      },
    });
  } catch (error) {
    console.error("❌ Error in clause conditions by clauses API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت شرایط",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
