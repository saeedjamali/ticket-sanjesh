import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import AppealRequest from "@/models/AppealRequest";
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

    // فیلتر درخواست‌های زوج فرهنگی برای منطقه مربوطه
    const query = {
      "culturalCoupleInfo.districtCode": districtCode,
    };

    // دریافت درخواست‌های زوج فرهنگی
    const requests = await AppealRequest.find(query)
      .select({
        culturalCoupleInfo: 1,
        nationalId: 1,
        fullName: 1,
      })
      .lean();

    // بررسی وضعیت تکمیل
    const totalRequests = requests.length;
    const reviewedRequests = requests.filter(
      (req) => req.culturalCoupleInfo?.spouseDistrictDecision
    ).length;
    const pendingRequests = totalRequests - reviewedRequests;

    const isCompleted = pendingRequests === 0;

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        reviewedRequests,
        pendingRequests,
        isCompleted,
        districtCode,
      },
    });
  } catch (error) {
    console.error("Error checking cultural couple requests completion:", error);
    return NextResponse.json(
      { success: false, error: "خطا در بررسی وضعیت درخواست‌ها" },
      { status: 500 }
    );
  }
}
