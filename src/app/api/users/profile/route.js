import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authService } from "@/lib/auth/authService";
import UserModel from "@/models/User";
import Province from "@/models/Province";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";

export async function GET(request) {
  try {
    const userId = await authService.validateToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("userId----->", userId);
    await connectDB();
    const user = await UserModel.findOne(
      { _id: userId.id },
      {
        projection: {
          password: 0,
          __v: 0,
        },
      }
    ).populate("province district examCenter");
    console.log("user|||||----->", user);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in profile API:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
