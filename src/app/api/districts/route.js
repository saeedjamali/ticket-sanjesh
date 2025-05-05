import { NextResponse } from "next/server";
import { ROLES } from "@/lib/permissions";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import AcademicYear from "@/models/AcademicYear";
import dbConnect from "@/lib/dbConnect";
import { authService } from "@/lib/auth/authService";

// GET /api/districts - Retrieve all districts
export async function GET(request) {
  try {
    console.log("GET /api/districts - Request received");

    await dbConnect();
    console.log("GET /api/districts - Connected to database");

    const user = await authService.validateToken(request);
    if (!user) {
      console.log("GET /api/districts - User authentication: false");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت کاربر" },
        { status: 401 }
      );
    }

    console.log(
      "GET /api/districts - Authentication successful for role:",
      user.role
    );

    const { searchParams } = new URL(request.url);
    const provinceFilter = searchParams.get("province");

    let query = {};
    if (provinceFilter) {
      console.log(`GET /api/districts - Province filter: ${provinceFilter}`);
      query.province = provinceFilter;
    } else if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.GENERAL_MANAGER
    ) {
      if (user.province) {
        console.log(
          `GET /api/districts - Filtering by user province: ${user.province}`
        );
        query.province = user.province;
      } else {
        console.log("GET /api/districts - Non-admin user without province ID");
        return NextResponse.json(
          { success: false, error: "شناسه استان برای کاربر تعریف نشده است" },
          { status: 400 }
        );
      }
    }

    console.log("GET /api/districts - Final query:", query);

    const districts = await District.find(query)
      .populate("province", "name code")
      .lean();

    console.log(`GET /api/districts - Found ${districts.length} districts`);
    return NextResponse.json({ success: true, districts });
  } catch (error) {
    console.error("GET /api/districts - Error:", error);
    return NextResponse.json(
      { success: false, error: `خطا در دریافت مناطق: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST /api/districts - Create a new district
export async function POST(request) {
  try {
    console.log("POST /api/districts - Request received");

    await dbConnect();
    console.log("POST /api/districts - Connected to database");

    const user = await authService.validateToken(request);
    if (!user) {
      console.log("POST /api/districts - User authentication: false");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت کاربر" },
        { status: 401 }
      );
    }

    if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.GENERAL_MANAGER
    ) {
      console.log("POST /api/districts - Insufficient permissions");
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای ایجاد منطقه را ندارید" },
        { status: 403 }
      );
    }

    const data = await request.json();

    if (!data.name) {
      return NextResponse.json(
        { success: false, error: "نام منطقه الزامی است" },
        { status: 400 }
      );
    }

    if (!data.province) {
      return NextResponse.json(
        { success: false, error: "انتخاب استان الزامی است" },
        { status: 400 }
      );
    }

    const existingDistrict = await District.findOne({
      name: data.name,
      province: data.province,
    });

    if (existingDistrict) {
      return NextResponse.json(
        {
          success: false,
          error: "منطقه‌ای با این نام در استان انتخاب شده وجود دارد",
        },
        { status: 400 }
      );
    }

    if (data.code) {
      const existingCode = await District.findOne({ code: data.code });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: "کد منطقه تکراری است" },
          { status: 400 }
        );
      }
    }

    const academicYear = await AcademicYear.findOne({ isActive: true });
    if (!academicYear) {
      return NextResponse.json(
        {
          success: false,
          error:
            "سال تحصیلی فعال یافت نشد. لطفا ابتدا یک سال تحصیلی فعال تعریف کنید",
        },
        { status: 400 }
      );
    }

    const district = await District.create({
      name: data.name,
      code: data.code || "",
      province: data.province,
      academicYear: academicYear.year,
      createdBy: user.id,
    });

    console.log("POST /api/districts - District created successfully");
    return NextResponse.json({ success: true, district }, { status: 201 });
  } catch (error) {
    console.error("POST /api/districts - Error:", error);
    return NextResponse.json(
      { success: false, error: `خطا در ایجاد منطقه: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT /api/districts - Update a district
export async function PUT(request) {
  try {
    console.log("PUT /api/districts - Request received");

    await dbConnect();
    console.log("PUT /api/districts - Connected to database");

    const user = await authService.validateToken(request);
    if (!user) {
      console.log("PUT /api/districts - User authentication: false");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت کاربر" },
        { status: 401 }
      );
    }

    if (
      user.role !== ROLES.SYSTEM_ADMIN &&
      user.role !== ROLES.GENERAL_MANAGER
    ) {
      console.log("PUT /api/districts - Insufficient permissions");
      return NextResponse.json(
        {
          success: false,
          error: "شما دسترسی لازم برای ویرایش منطقه را ندارید",
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { success: false, error: "شناسه منطقه الزامی است" },
        { status: 400 }
      );
    }

    const district = await District.findById(data.id);
    if (!district) {
      return NextResponse.json(
        { success: false, error: "منطقه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    if (data.name && data.name !== district.name) {
      const existingDistrict = await District.findOne({
        name: data.name,
        province: data.province || district.province,
        _id: { $ne: data.id },
      });

      if (existingDistrict) {
        return NextResponse.json(
          {
            success: false,
            error: "منطقه‌ای با این نام در استان انتخاب شده وجود دارد",
          },
          { status: 400 }
        );
      }
    }

    if (data.code && data.code !== district.code) {
      const existingCode = await District.findOne({
        code: data.code,
        _id: { $ne: data.id },
      });

      if (existingCode) {
        return NextResponse.json(
          { success: false, error: "کد منطقه تکراری است" },
          { status: 400 }
        );
      }
    }

    district.name = data.name || district.name;
    district.code = data.code || district.code;
    district.province = data.province || district.province;
    district.updatedBy = user.id;
    district.updatedAt = new Date();

    await district.save();
    console.log("PUT /api/districts - District updated successfully");
    return NextResponse.json({ success: true, district });
  } catch (error) {
    console.error("PUT /api/districts - Error:", error);
    return NextResponse.json(
      { success: false, error: `خطا در بروزرسانی منطقه: ${error.message}` },
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
