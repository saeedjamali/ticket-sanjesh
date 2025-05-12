import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { authService } from "@/lib/auth/authService";

// PATCH /api/users/password - Change user password
export async function PATCH(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();
    console.log("data----->", data);
    // Validate required fields
    if (!data.id || !data.password) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    const user = await User.findById(data.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to change this user's password
    let hasPermission = false;
    let requiresCurrentPassword = false;
    if (userAuth.id === user._id.toString()) {
      // Users can change their own password
      // For changing own password, current password should be verified
      hasPermission = true;
      requiresCurrentPassword = true;
    } else if (userAuth.role === ROLES.SYSTEM_ADMIN) {
      // System admin can change any user's password
      hasPermission = true;
    } else if (userAuth.role === ROLES.GENERAL_MANAGER) {
      // General manager can change province experts' passwords
      if (
        [ROLES.PROVINCE_EDUCATION_EXPERT, ROLES.PROVINCE_TECH_EXPERT].includes(
          user.role
        )
      ) {
        hasPermission = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TECH_EXPERT) {
      // Province tech expert can change district experts' passwords
      if (
        [ROLES.DISTRICT_EDUCATION_EXPERT, ROLES.DISTRICT_TECH_EXPERT].includes(
          user.role
        )
      ) {
        hasPermission = true;

        // Must be for their own province
        if (user.province.toString() !== userAuth.province) {
          hasPermission = false;
        }
      }
    } else if (userAuth.role === ROLES.DISTRICT_TECH_EXPERT) {
      // District tech expert can change exam center managers' passwords
      if (user.role === ROLES.EXAM_CENTER_MANAGER) {
        hasPermission = true;

        // Must be for their own district
        if (user.district.toString() !== userAuth.district) {
          hasPermission = false;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If changing own password, verify the current password
    if (requiresCurrentPassword && data.currentPassword) {
      const isPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "رمز عبور فعلی صحیح نیست" },
          { status: 400 }
        );
      }
    } else if (requiresCurrentPassword && !data.currentPassword) {
      return NextResponse.json(
        { error: "رمز عبور فعلی الزامی است" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Update password
    user.password = hashedPassword;
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/users/password:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
