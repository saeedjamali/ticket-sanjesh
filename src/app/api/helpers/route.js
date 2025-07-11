import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";
import Province from "@/models/Province";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";

export async function GET(request) {
  try {
    // Authentication check
    const user = await authService.getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let data = [];

    switch (type) {
      case "academic-years":
        data = await AcademicYear.find(
          {},
          {
            _id: 1,
            title: 1,
            startDate: 1,
            endDate: 1,
            isActive: 1,
          }
        ).sort({ isActive: -1, startDate: -1 });
        break;

      case "provinces":
        data = await Province.find(
          {},
          {
            code: 1,
            name: 1,
          }
        ).sort({ name: 1 });
        break;

      case "districts": {
        const provinceCode = searchParams.get("province");
        const filter = provinceCode ? { provinceCode } : {};
        data = await District.find(filter, {
          code: 1,
          name: 1,
          provinceCode: 1,
        }).sort({ name: 1 });
        break;
      }

      case "organizational-units": {
        const districtCode = searchParams.get("district");
        const provinceCode = searchParams.get("province");
        let filter = {};

        if (districtCode) {
          // Find district by code first
          const district = await District.findOne({ code: districtCode });
          if (district) {
            filter.district = district._id;
          }
        }
        if (provinceCode && !districtCode) {
          // If only province is specified, find all districts in that province
          const districts = await District.find().populate("province");
          const provinceDistricts = districts.filter(
            (d) => d.province.code === provinceCode
          );
          if (provinceDistricts.length > 0) {
            filter.district = { $in: provinceDistricts.map((d) => d._id) };
          }
        }

        data = await ExamCenter.find(filter, {
          code: 1,
          name: 1,
        }).sort({ name: 1 });
        break;
      }

      case "grades":
        data = await CourseGrade.find(
          {},
          {
            _id: 1,
            title: 1,
            code: 1,
          }
        ).sort({ code: 1 });
        break;

      case "fields":
        data = await CourseBranchField.find(
          {},
          {
            _id: 1,
            title: 1,
            code: 1,
          }
        ).sort({ code: 1 });
        break;

      default:
        return NextResponse.json(
          { success: false, message: "نوع داده نامعتبر است" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching helper data:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}
