import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import ClauseCondition from "@/models/ClauseCondition";
import { authService } from "@/lib/auth/authService";

// GET /api/debug-clause-conditions - Debug endpoint
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

    // بررسی مستقیم MongoDB
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("📋 Available collections:", collectionNames);

    // جستجو در clauseconditions
    const directClauseConditions = await db
      .collection("clauseconditions")
      .find({})
      .toArray();
    console.log(
      "🔍 Direct clauseconditions count:",
      directClauseConditions.length
    );

    // جستجو در ClauseCondition model
    const modelClauseConditions = await ClauseCondition.find({}).lean();
    console.log(
      "📊 Model ClauseCondition count:",
      modelClauseConditions.length
    );

    // بررسی نام collection در model
    const modelCollectionName = ClauseCondition.collection.collectionName;
    console.log("🏷️ Model collection name:", modelCollectionName);

    return NextResponse.json({
      success: true,
      debug: {
        availableCollections: collectionNames,
        directQueryCount: directClauseConditions.length,
        modelQueryCount: modelClauseConditions.length,
        modelCollectionName: modelCollectionName,
        directResults: directClauseConditions,
        modelResults: modelClauseConditions,
        hasClauseConditionsCollection:
          collectionNames.includes("clauseconditions"),
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در debug",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
