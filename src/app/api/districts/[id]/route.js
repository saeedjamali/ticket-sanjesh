import { NextResponse } from "next/server";
import { ROLES } from "@/lib/permissions";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import dbConnect from "@/lib/dbConnect";
import { authService } from "@/lib/auth/authService";

// GET /api/districts/[id] - Get district by ID
export async function GET(request, { params }) {
  try {
    const id = params?.id;
    console.log(`GET /api/districts/${id} - Request received`);

    await dbConnect();
    console.log("GET /api/districts/[id] - Connected to database");

    const user = await authService.validateToken(request);
    if (!user) {
      console.log("GET /api/districts/[id] - User authentication: false");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت کاربر" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه منطقه الزامی است" },
        { status: 400 }
      );
    }

    const district = await District.findById(id)
      .populate("province", "name")
      .lean();
    if (!district) {
      return NextResponse.json(
        { success: false, error: "منطقه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      district: {
        ...district,
        _id: district._id.toString(),
        province: district.province._id.toString(),
        province_name: district.province.name,
      },
    });
  } catch (error) {
    console.error(`GET /api/districts/[id] - Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: `خطا در دریافت اطلاعات منطقه: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/districts - Delete a district
export async function DELETE(request, { params }) {
  try {
    const id = await params?.id;
    console.log("DELETE /api/districts - Request received");

    await dbConnect();
    console.log("DELETE /api/districts - Connected to database");

    const user = await authService.validateToken(request);
    if (!user) {
      console.log("DELETE /api/districts - User authentication: false");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت کاربر" },
        { status: 401 }
      );
    }

    if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.GENERAL_MANAGER
    ) {
      console.log("DELETE /api/districts - Insufficient permissions");
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای حذف منطقه را ندارید" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه منطقه الزامی است" },
        { status: 400 }
      );
    }

    const district = await District.findById(id);
    if (!district) {
      return NextResponse.json(
        { success: false, error: "منطقه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    const hasExamCenters = await ExamCenter.exists({ district: id });
    if (hasExamCenters) {
      return NextResponse.json(
        {
          success: false,
          error: "این منطقه دارای حوزه‌های امتحانی است و قابل حذف نیست",
        },
        { status: 400 }
      );
    }

    await district.deleteOne();
    console.log("DELETE /api/districts - District deleted successfully");
    return NextResponse.json({
      success: true,
      message: "منطقه با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("DELETE /api/districts - Error:", error);
    return NextResponse.json(
      { success: false, error: `خطا در حذف منطقه: ${error.message}` },
      { status: 500 }
    );
  }
}
