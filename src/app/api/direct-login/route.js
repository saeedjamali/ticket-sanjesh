import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { tokenService } from "@/lib/auth/tokenService";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth/tokenService";

// Define UserSchema here in case the import fails
const UserSchema = new mongoose.Schema({
  nationalId: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: {
    type: String,
    enum: [
      "systemAdmin",
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "districtEducationExpert",
      "districtTechExpert",
      "examCenterManager",
    ],
    required: true,
  },
  province: { type: mongoose.Schema.Types.ObjectId, ref: "Province" },
  district: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
  examCenter: { type: mongoose.Schema.Types.ObjectId, ref: "ExamCenter" },
  createdAt: { type: Date, default: Date.now },
  academicYear: { type: String },
});

export async function POST(request) {
  try {
    await dbConnect();

    const { username, password } = await request.json();

    // Find user or create test user if not exists
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        password,
        role: "USER",
        name: "کاربر تست",
        phone: "09123456789",
        email: "test@test.com",
      });
    }

    // Generate tokens using tokenService object
    const accessToken = await tokenService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const refreshToken = await tokenService.generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // Set cookies
    const cookieStore = cookies();
    cookieStore.set("access-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    cookieStore.set("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      message: "ورود موفقیت‌آمیز بود",
      data: {
        user: {
          _id: user._id,
          role: user.role,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "خطا در ورود به سیستم" },
      { status: 500 }
    );
  }
}
