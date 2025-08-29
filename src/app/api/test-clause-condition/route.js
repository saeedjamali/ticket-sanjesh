import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import ClauseCondition from "@/models/ClauseCondition";
import TransferReason from "@/models/TransferReason";
import { authService } from "@/lib/auth/authService";

// POST /api/test-clause-condition - ایجاد شرط تست
export async function POST(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // فقط systemAdmin می‌تواند شرط تست ایجاد کند
    if (user.role !== "systemAdmin") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی - فقط مدیر سیستم" },
        { status: 403 }
      );
    }

    await connectDB();

    // پیدا کردن یک بند انتقال فعال
    const sampleReason = await TransferReason.findOne({ isActive: true });

    if (!sampleReason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "هیچ بند انتقال فعالی یافت نشد. ابتدا یک بند انتقال ایجاد کنید.",
        },
        { status: 400 }
      );
    }

    console.log("📋 Found sample transfer reason:", sampleReason.title);

    // بررسی اینکه آیا شرط تست قبلاً وجود دارد یا نه
    const existingCondition = await ClauseCondition.findOne({
      title: "شرط نمونه برای تست",
    });

    if (existingCondition) {
      return NextResponse.json(
        { success: false, error: "شرط تست قبلاً وجود دارد" },
        { status: 400 }
      );
    }

    // ایجاد شرط نمونه
    const sampleCondition = new ClauseCondition({
      title: "شرط نمونه برای تست",
      description:
        "این یک شرط نمونه برای تست سیستم است. می‌توانید آن را حذف کنید.",
      conditionType: "approval",
      relatedClauses: [
        {
          clauseId: sampleReason._id,
          priority: 5,
        },
      ],
      importanceLevel: "medium",
      isActive: true,
      validFrom: new Date(),
      validUntil: null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await sampleCondition.save();
    console.log("✅ Sample clause condition created successfully!");

    // بررسی کل شرایط موجود
    const totalConditions = await ClauseCondition.countDocuments();
    console.log("📊 Total conditions in database:", totalConditions);

    // populate کردن اطلاعات برای response
    const populatedCondition = await ClauseCondition.findById(
      sampleCondition._id
    )
      .populate("relatedClauses.clauseId", "title clauseType")
      .populate("createdBy", "username fullName")
      .populate("updatedBy", "username fullName");

    return NextResponse.json({
      success: true,
      data: populatedCondition,
      message: "شرط نمونه با موفقیت ایجاد شد",
      statistics: {
        totalConditions: totalConditions,
        relatedReason: sampleReason.title,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/test-clause-condition:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد شرط تست",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/test-clause-condition - بررسی وضعیت
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const totalConditions = await ClauseCondition.countDocuments();
    const totalReasons = await TransferReason.countDocuments({
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalConditions,
        totalActiveReasons: totalReasons,
        message:
          totalConditions === 0
            ? "هیچ شرطی موجود نیست"
            : `${totalConditions} شرط موجود است`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/test-clause-condition:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در بررسی وضعیت",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
