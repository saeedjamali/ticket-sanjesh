import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import User from "@/models/User";
import District from "@/models/District";

export async function GET(request) {
  try {
    await connectDB();

    // بررسی احراز هویت
    const user = await authService.validateToken(request);
    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت لازم است" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران districtTransferExpert
    if (user.role !== "districtTransferExpert") {
      return NextResponse.json(
        { success: false, error: "شما به این بخش دسترسی ندارید" },
        { status: 403 }
      );
    }

    // دریافت اطلاعات کاربر کامل برای دسترسی به district
    const userDetails = await User.findById(user.userId).populate("district");

    if (!userDetails || !userDetails.district) {
      return NextResponse.json(
        { success: false, error: "اطلاعات منطقه کاربر یافت نشد" },
        { status: 404 }
      );
    }

    const districtCode = userDetails.district.code;

    // دریافت درخواست‌های اصلاح مشخصات برای منطقه مربوطه
    const requests = await ProfileCorrectionRequest.find({
      districtCode: districtCode,
    })
      .select({
        status: 1,
        nationalId: 1,
        fullName: 1,
        createdAt: 1,
      })
      .lean();

    // بررسی وضعیت تکمیل
    const totalRequests = requests.length;
    const completedRequests = requests.filter(
      (req) => req.status === "approved" || req.status === "rejected"
    ).length;
    const pendingRequests = totalRequests - completedRequests;

    const isCompleted = pendingRequests === 0;

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        completedRequests,
        pendingRequests,
        isCompleted,
        districtCode,
        // جزئیات بیشتر برای دیباگ
        requestsByStatus: {
          pending: requests.filter((req) => req.status === "pending").length,
          approved: requests.filter((req) => req.status === "approved").length,
          rejected: requests.filter((req) => req.status === "rejected").length,
        },
      },
    });
  } catch (error) {
    console.error("Error checking correction requests completion:", error);
    return NextResponse.json(
      { success: false, error: "خطا در بررسی وضعیت درخواست‌ها" },
      { status: 500 }
    );
  }
}
