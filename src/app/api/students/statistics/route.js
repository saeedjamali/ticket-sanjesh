import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";

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

    // Permission check - only for GENERAL_MANAGER
    if (user.role !== ROLES.GENERAL_MANAGER) {
      return NextResponse.json(
        { success: false, message: "شما مجوز دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);

    // Build filter query
    const filter = {};

    // Academic Year filter
    const academicYear = searchParams.get("academicYear");
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    // Province filter
    const province = searchParams.get("province");
    if (province) {
      filter.provinceCode = province;
    }

    // District filter
    const district = searchParams.get("district");
    if (district) {
      filter.districtCode = district;
    }

    // Organizational Unit filter
    const organizationalUnit = searchParams.get("organizationalUnit");
    if (organizationalUnit) {
      filter.organizationalUnitCode = organizationalUnit;
    }

    // Grade filter
    const grade = searchParams.get("grade");
    if (grade) {
      filter.gradeId = grade;
    }

    // Field filter
    const field = searchParams.get("field");
    if (field) {
      filter.fieldId = field;
    }

    // Gender filter
    const gender = searchParams.get("gender");
    if (gender) {
      filter.gender = gender;
    }

    // Get total count
    const total = await Student.countDocuments(filter);

    // Get gender statistics
    const genderStats = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    let maleCount = 0;
    let femaleCount = 0;

    genderStats.forEach((stat) => {
      if (stat._id === "male") {
        maleCount = stat.count;
      } else if (stat._id === "female") {
        femaleCount = stat.count;
      }
    });

    // Get grade statistics
    const gradeStats = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$gradeId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "coursegrades",
          localField: "_id",
          foreignField: "_id",
          as: "grade",
        },
      },
      {
        $unwind: {
          path: "$grade",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          gradeTitle: { $ifNull: ["$grade.title", "نامشخص"] },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get field statistics
    const fieldStats = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$fieldId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "coursebranchfields",
          localField: "_id",
          foreignField: "_id",
          as: "field",
        },
      },
      {
        $unwind: {
          path: "$field",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          fieldTitle: { $ifNull: ["$field.title", "نامشخص"] },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get organizational units count (distinct)
    const organizationalUnitsCount = await Student.distinct(
      "organizationalUnitCode",
      filter
    ).then((result) => result.length);

    // Get province statistics (only if no province filter is applied)
    let provinceStats = [];
    if (!province) {
      provinceStats = await Student.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$provinceCode",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 }, // Top 10 provinces
      ]);
    }

    // Get academic year statistics (only if no academic year filter is applied)
    let academicYearStats = [];
    if (!academicYear) {
      academicYearStats = await Student.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$academicYear",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "academicyears",
            localField: "_id",
            foreignField: "_id",
            as: "year",
          },
        },
        {
          $unwind: {
            path: "$year",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            count: 1,
            yearTitle: { $ifNull: ["$year.title", "نامشخص"] },
          },
        },
        { $sort: { count: -1 } },
      ]);
    }

    const statistics = {
      total,
      maleCount,
      femaleCount,
      organizationalUnitsCount,
      gradeStats: gradeStats.slice(0, 10), // Top 10 grades
      fieldStats: fieldStats.slice(0, 10), // Top 10 fields
      provinceStats,
      academicYearStats,
    };

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Error fetching student statistics:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار" },
      { status: 500 }
    );
  }
}
