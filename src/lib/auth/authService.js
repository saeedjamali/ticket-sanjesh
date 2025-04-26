import { tokenService } from "./tokenService";
import { AUTH_CONFIG } from "./config";
import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// ایجاد یک ObjectId ثابت برای کاربر تست - باید با direct-login یکسان باشد
const TEST_USER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

class AuthService {
  async login(nationalId, password) {
    try {
      await connectDB();

      // Find user
      const user = await User.findOne({ nationalId })
        .populate("province", "name")
        .populate("district", "name")
        .populate("examCenter", "name");

      // Check if user exists
      if (!user) {
        throw new Error("کد ملی یا رمز عبور اشتباه است");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error("حساب کاربری شما غیرفعال است");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("کد ملی یا رمز عبور اشتباه است");
      }

      // Generate tokens
      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role,
      };

      const accessToken = await tokenService.generateAccessToken(tokenPayload);
      const refreshToken = await tokenService.generateRefreshToken(
        tokenPayload
      );

      // Prepare user data
      const userData = {
        id: user._id.toString(),
        fullName: user.fullName,
        nationalId: user.nationalId,
        role: user.role,
        isActive: user.isActive,
        province: user.province,
        district: user.district,
        examCenter: user.examCenter,
        academicYear: user.academicYear,
      };

      return {
        accessToken,
        refreshToken,
        user: userData,
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async validateToken(request) {
    try {
      // Get access token from cookie
      const accessToken = request.cookies.get("access-token")?.value;
      if (!accessToken) {
        throw new Error("No access token found");
      }

      // Verify access token
      const decoded = await tokenService.verifyAccessToken(accessToken);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid access token");
      }

      // اگر کاربر تست است، اطلاعات تست را برگردانیم
      if (decoded.userId === TEST_USER_ID.toString()) {
        return {
          id: TEST_USER_ID.toString(),
          fullName: "مدیر سیستم",
          nationalId: "1111111111",
          role: "systemAdmin",
          isActive: true,
          province: null,
          district: null,
          examCenter: null,
          academicYear: "1402-1403",
        };
      }

      // Connect to database
      await connectDB();

      // Get user
      const user = await User.findById(decoded.userId)
        .populate("province district examCenter")
        .lean();

      if (!user) {
        throw new Error("User not found");
      }

      // Format user data
      return {
        id: user._id.toString(),
        fullName: user.fullName,
        nationalId: user.nationalId,
        role: user.role,
        isActive: user.isActive || true,
        province: user.province ? user.province._id.toString() : null,
        district: user.district ? user.district._id.toString() : null,
        examCenter: user.examCenter ? user.examCenter._id.toString() : null,
        academicYear: user.academicYear || "1402-1403",
      };
    } catch (error) {
      console.error("Token validation error:", error);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid refresh token");
      }

      // اگر کاربر تست است، اطلاعات تست را برگردانیم
      if (decoded.userId === TEST_USER_ID.toString()) {
        const payload = {
          userId: TEST_USER_ID.toString(),
          role: "systemAdmin",
        };

        const accessToken = await tokenService.generateAccessToken(payload);
        const newRefreshToken = await tokenService.generateRefreshToken(
          payload
        );

        const userData = {
          id: TEST_USER_ID.toString(),
          fullName: "مدیر سیستم",
          nationalId: "1111111111",
          role: "systemAdmin",
          isActive: true,
          province: null,
          district: null,
          examCenter: null,
          academicYear: "1402-1403",
        };

        return {
          accessToken,
          refreshToken: newRefreshToken,
          user: userData,
        };
      }

      // Connect to database
      await connectDB();

      // Get user
      const user = await User.findById(decoded.userId)
        .populate("province district examCenter")
        .lean();

      if (!user) {
        throw new Error("User not found");
      }

      // Generate new tokens
      const payload = {
        userId: user._id.toString(),
        role: user.role,
      };

      const accessToken = await tokenService.generateAccessToken(payload);
      const newRefreshToken = await tokenService.generateRefreshToken(payload);

      // Format user data
      const userData = {
        id: user._id.toString(),
        fullName: user.fullName,
        nationalId: user.nationalId,
        role: user.role,
        isActive: user.isActive || true,
        province: user.province ? user.province._id.toString() : null,
        district: user.district ? user.district._id.toString() : null,
        examCenter: user.examCenter ? user.examCenter._id.toString() : null,
        academicYear: user.academicYear || "1402-1403",
      };

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: userData,
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  isPublicPath(pathname) {
    return (
      ["/login", "/register", "/forgot-password", "/api/auth/login"].includes(
        pathname
      ) ||
      pathname.startsWith("/api/public/") ||
      pathname.startsWith("/_next/") ||
      pathname.endsWith(".ico")
    );
  }
}

export const authService = new AuthService();
