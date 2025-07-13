import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DropoutReason from "@/models/DropoutReason";

export async function POST(request) {
  try {
    await dbConnect();

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const reason = await DropoutReason.findById(id);
    if (!reason) {
      return NextResponse.json(
        { success: false, error: "Reason not found" },
        { status: 404 }
      );
    }

    console.log("Before toggle - isActive:", reason.isActive);

    reason.isActive = !reason.isActive;

    console.log("After toggle - isActive:", reason.isActive);

    await reason.save();

    console.log("After save - isActive:", reason.isActive);

    // دوباره از دیتابیس بخوان
    const updatedReason = await DropoutReason.findById(id);
    console.log("Re-fetched - isActive:", updatedReason.isActive);

    return NextResponse.json({
      success: true,
      data: updatedReason,
    });
  } catch (error) {
    console.error("Toggle test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
