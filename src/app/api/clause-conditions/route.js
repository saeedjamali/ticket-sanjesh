import { NextResponse } from "next/server";
import mongoose from "mongoose";

import ClauseCondition from "@/models/ClauseCondition";
import TransferReason from "@/models/TransferReason";
import { authService } from "@/lib/auth/authService";
import dbConnect from "@/lib/dbConnect";

// GET /api/clause-conditions - دریافت لیست شرایط بندها
export async function GET(request) {
  try {
    console.log("🔍 GET /api/clause-conditions called");
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      console.log("❌ Authentication failed");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", user.role);
    await dbConnect();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const search = url.searchParams.get("search") || "";
    const conditionType = url.searchParams.get("conditionType") || "";
    const isActive = url.searchParams.get("isActive");
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    // ساخت فیلتر
    let filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { conditionId: regex },
      ];
    }

    if (conditionType) {
      filter.conditionType = conditionType;
    }

    if (!includeInactive) {
      filter.isActive = true;
    } else if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // محاسبه skip برای pagination
    const skip = (page - 1) * limit;

    // دریافت داده‌ها
    console.log("🔎 Searching with filter:", filter);

    // بررسی مستقیم collection
    const db = mongoose.connection.db;
    const directResult = await db
      .collection("clauseconditions")
      .find({})
      .toArray();
    console.log("🔍 Direct MongoDB query result:", directResult.length);
    console.log("📝 Direct result sample:", directResult[0]);

    // ابتدا بدون populate تست می‌کنیم
    const conditionsRaw = await ClauseCondition.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("📊 Raw conditions found:", conditionsRaw.length);
    console.log("📝 First condition (if any):", conditionsRaw[0]);

    // تست populate به تدریج
    let conditions;

    try {
      // ابتدا بدون populate
      conditions = await ClauseCondition.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      console.log("📊 Step 1 - Without populate:", conditions.length);

      // سپس با populate TransferReason
      try {
        const populatedConditions = await ClauseCondition.find(filter)
          .populate("relatedClauses.clauseId", "title clauseType isActive")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
        console.log(
          "📊 Step 2 - With TransferReason populate:",
          populatedConditions.length
        );
        conditions = populatedConditions;
      } catch (populateError) {
        console.error(
          "❌ TransferReason populate failed:",
          populateError.message
        );
        // ادامه با نتیجه بدون populate
      }
    } catch (error) {
      console.error("❌ Basic query failed:", error.message);
      conditions = [];
    }

    console.log("📊 Final conditions count:", conditions.length);

    // استفاده از نتیجه raw در صورت مشکل
    const finalConditions = conditions.length > 0 ? conditions : conditionsRaw;

    // شمارش کل رکوردها
    const totalCount = await ClauseCondition.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    console.log("📈 Total count:", totalCount);

    return NextResponse.json({
      success: true,
      data: {
        conditions: finalConditions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      debug: {
        rawCount: conditionsRaw.length,
        finalCount: conditions.length,
        returnedCount: finalConditions.length,
        usingRaw: conditions.length === 0 && conditionsRaw.length > 0,
        filter: filter,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/clause-conditions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت شرایط بندها",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/clause-conditions - ایجاد شرط جدید
export async function POST(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط systemAdmin
    if (!["systemAdmin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      title,
      description,
      conditionType,
      relatedClauses = [],
      importanceLevel = "medium",
      validFrom,
      validUntil,
    } = body;

    // اعتبارسنجی فیلدهای الزامی
    if (!title || !conditionType) {
      return NextResponse.json(
        { success: false, error: "عنوان و نوع شرط الزامی است" },
        { status: 400 }
      );
    }

    // بررسی معتبر بودن نوع شرط
    if (!["approval", "rejection"].includes(conditionType)) {
      return NextResponse.json(
        { success: false, error: "نوع شرط نامعتبر است" },
        { status: 400 }
      );
    }

    // بررسی وجود بندهای انتخاب شده
    if (relatedClauses.length > 0) {
      const clauseIds = relatedClauses.map((clause) => clause.clauseId);
      const existingClauses = await TransferReason.find({
        _id: { $in: clauseIds },
        isActive: true,
      });

      if (existingClauses.length !== clauseIds.length) {
        return NextResponse.json(
          { success: false, error: "برخی از بندهای انتخاب شده معتبر نیستند" },
          { status: 400 }
        );
      }
    }

    // ایجاد شرط جدید
    const newCondition = new ClauseCondition({
      title: title.trim(),
      description: description.trim(),
      conditionType,
      relatedClauses,
      importanceLevel,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await newCondition.save();

    // populate کردن اطلاعات برای response
    const populatedCondition = await ClauseCondition.findById(newCondition._id)
      .populate("relatedClauses.clauseId", "title clauseType")
      .populate("createdBy", "username fullName")
      .populate("updatedBy", "username fullName");

    return NextResponse.json({
      success: true,
      data: populatedCondition,
      message: "شرط با موفقیت ایجاد شد",
    });
  } catch (error) {
    console.error("Error in POST /api/clause-conditions:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "شناسه شرط تکراری است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطا در ایجاد شرط",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/clause-conditions - بروزرسانی شرط
export async function PUT(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط systemAdmin
    if (!["systemAdmin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      id,
      title,
      description,
      conditionType,
      relatedClauses,
      importanceLevel,
      isActive,
      validFrom,
      validUntil,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه شرط الزامی است" },
        { status: 400 }
      );
    }

    // یافتن شرط
    const condition = await ClauseCondition.findById(id);
    if (!condition) {
      return NextResponse.json(
        { success: false, error: "شرط یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود بندهای انتخاب شده (در صورت ارائه)
    if (relatedClauses && relatedClauses.length > 0) {
      const clauseIds = relatedClauses.map((clause) => clause.clauseId);
      const existingClauses = await TransferReason.find({
        _id: { $in: clauseIds },
        isActive: true,
      });

      if (existingClauses.length !== clauseIds.length) {
        return NextResponse.json(
          { success: false, error: "برخی از بندهای انتخاب شده معتبر نیستند" },
          { status: 400 }
        );
      }
    }

    // بروزرسانی فیلدها
    const updateData = {
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (conditionType !== undefined) updateData.conditionType = conditionType;
    if (relatedClauses !== undefined)
      updateData.relatedClauses = relatedClauses;
    if (importanceLevel !== undefined)
      updateData.importanceLevel = importanceLevel;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (validFrom !== undefined)
      updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil !== undefined)
      updateData.validUntil = validUntil ? new Date(validUntil) : null;

    const updatedCondition = await ClauseCondition.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("relatedClauses.clauseId", "title clauseType")
      .populate("createdBy", "username fullName")
      .populate("updatedBy", "username fullName");

    return NextResponse.json({
      success: true,
      data: updatedCondition,
      message: "شرط با موفقیت بروزرسانی شد",
    });
  } catch (error) {
    console.error("Error in PUT /api/clause-conditions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در بروزرسانی شرط",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/clause-conditions - حذف شرط
export async function DELETE(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط systemAdmin
    if (user.role !== "systemAdmin") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await dbConnect();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه شرط الزامی است" },
        { status: 400 }
      );
    }

    const condition = await ClauseCondition.findById(id);
    if (!condition) {
      return NextResponse.json(
        { success: false, error: "شرط یافت نشد" },
        { status: 404 }
      );
    }

    await ClauseCondition.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "شرط با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/clause-conditions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در حذف شرط",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
