import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ApprovalReason from "@/models/ApprovalReason";
import { authService } from "@/lib/auth/authService";

// GET /api/approval-reasons - دریافت دلایل موافقت و مخالفت
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    if (
      !user ||
      !["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "دسترسی محدود - تنها کارشناسان مجاز هستند" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت همه دلایل فعال
    const approvalReasons = await ApprovalReason.find({
      isActive: true,
    }).sort({ type: 1, title: 1 });

    return NextResponse.json({
      success: true,
      data: {
        approval: approvalReasons.filter(
          (reason) => reason.type === "approval"
        ),
        rejection: approvalReasons.filter(
          (reason) => reason.type === "rejection"
        ),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/approval-reasons:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت دلایل" },
      { status: 500 }
    );
  }
}




