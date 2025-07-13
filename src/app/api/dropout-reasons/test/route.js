import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DropoutReason from "@/models/DropoutReason";

export async function GET() {
  try {
    await dbConnect();

    const allReasons = await DropoutReason.find({});

    return NextResponse.json({
      success: true,
      count: allReasons.length,
      data: allReasons,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
