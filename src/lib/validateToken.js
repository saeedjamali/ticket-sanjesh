import { tokenService } from "@/lib/auth/tokenService";
import connectDB from "./db";
import User from "@/models/User";

async function validateToken(request) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get("access-token")?.value;
    if (!accessToken) {
      throw new Error("عدم احراز هویت");
    }

    // Verify access token
    const decoded = await tokenService.verifyAccessToken(accessToken);
    if (!decoded || !decoded.userId) {
      throw new Error("توکن نامعتبر است");
    }

    await connectDB();
    const user = await User.findById(decoded.userId)
      .populate("province", "name")
      .populate("district", "name")
      .populate("examCenter", "name");

    if (!user) {
      throw new Error("کاربر یافت نشد");
    }

    if (!user.isActive) {
      throw new Error("حساب کاربری غیرفعال است");
    }

    return {
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
  } catch (error) {
    console.error("Token validation error:", error);
    throw error;
  }
}

export default validateToken;
