import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت مقادیر منحصر به فرد برای فیلترهای واحد سازمانی
export async function GET(request) {
  try {
    await connectDB();

    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check if user can manage forms
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    if (!canManageForms) {
      return NextResponse.json(
        { success: false, message: "شما اجازه دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    // Build query based on user's province
    let query = { isActive: true };
    if (user.province) {
      // Get exam centers in user's province
      const examCenters = await ExamCenter.find(query).populate({
        path: "district",
        populate: { path: "province" },
      });

      const provinceExamCenters = examCenters.filter(
        (center) => center.district?.province?._id.toString() === user.province
      );

      // Extract unique values
      const genders = [
        ...new Set(
          provinceExamCenters.map((center) => center.gender).filter(Boolean)
        ),
      ];
      const periods = [
        ...new Set(
          provinceExamCenters.map((center) => center.period).filter(Boolean)
        ),
      ];
      const organizationTypes = [
        ...new Set(
          provinceExamCenters
            .map((center) => center.organizationType)
            .filter(Boolean)
        ),
      ];

      return NextResponse.json({
        success: true,
        filters: {
          genders: genders.map((gender) => ({ value: gender, label: gender })),
          periods: periods.map((period) => ({ value: period, label: period })),
          organizationTypes: organizationTypes.map((type) => ({
            value: type,
            label: type,
          })),
        },
      });
    }

    // If no province specified, return empty filters
    return NextResponse.json({
      success: true,
      filters: {
        genders: [],
        periods: [],
        organizationTypes: [],
      },
    });
  } catch (error) {
    console.error("Error fetching exam center filters:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت فیلترها",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
