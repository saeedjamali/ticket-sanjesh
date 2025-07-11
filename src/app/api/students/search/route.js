import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import ExamCenter from "@/models/ExamCenter";
import Province from "@/models/Province";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import * as XLSX from "xlsx";

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

    await connectDB();

    const { searchParams } = new URL(request.url);

    // Get search query
    const searchQuery = searchParams.get("q") || "";
    if (!searchQuery.trim()) {
      return NextResponse.json(
        { success: false, message: "متن جستجو نمی‌تواند خالی باشد" },
        { status: 400 }
      );
    }

    // Get pagination parameters
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Check if this is an export request
    const isExport = searchParams.get("export") === "true";

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

    // Add search criteria
    const searchConditions = [];

    // Search by name (firstName + lastName)
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery.replace(/\s+/g, ".*"), "i");

      searchConditions.push(
        { firstName: searchRegex },
        { lastName: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: searchQuery.replace(/\s+/g, ".*"),
              options: "i",
            },
          },
        },
        { nationalId: searchRegex },
        { studentNumber: searchRegex }
      );
    }

    if (searchConditions.length > 0) {
      filter.$or = searchConditions;
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "coursegrades",
          localField: "gradeId",
          foreignField: "_id",
          as: "grade",
        },
      },
      {
        $lookup: {
          from: "coursebranchfields",
          localField: "fieldId",
          foreignField: "_id",
          as: "field",
        },
      },
      {
        $lookup: {
          from: "examcenters",
          localField: "organizationalUnitCode",
          foreignField: "code",
          as: "organizationalUnit",
        },
      },
      {
        $lookup: {
          from: "provinces",
          localField: "provinceCode",
          foreignField: "code",
          as: "province",
        },
      },
      {
        $lookup: {
          from: "districts",
          localField: "districtCode",
          foreignField: "code",
          as: "district",
        },
      },
      {
        $addFields: {
          gradeName: {
            $ifNull: [{ $arrayElemAt: ["$grade.title", 0] }, "نامشخص"],
          },
          fieldName: {
            $ifNull: [{ $arrayElemAt: ["$field.title", 0] }, "نامشخص"],
          },
          organizationalUnitName: {
            $ifNull: [
              { $arrayElemAt: ["$organizationalUnit.name", 0] },
              "نامشخص",
            ],
          },
          provinceName: {
            $ifNull: [{ $arrayElemAt: ["$province.name", 0] }, "نامشخص"],
          },
          districtName: {
            $ifNull: [{ $arrayElemAt: ["$district.name", 0] }, "نامشخص"],
          },
          genderName: {
            $cond: {
              if: { $eq: ["$gender", "male"] },
              then: "پسر",
              else: "دختر",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          nationalId: 1,
          studentNumber: 1,
          gender: 1,
          genderName: 1,
          gradeName: 1,
          fieldName: 1,
          organizationalUnitName: 1,
          provinceName: 1,
          districtName: 1,
          phoneNumber: 1,
          birthDate: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    // If export is requested
    if (isExport) {
      const allStudents = await Student.aggregate(pipeline);

      // Prepare data for Excel export
      const excelData = allStudents.map((student, index) => ({
        ردیف: index + 1,
        نام: student.firstName,
        "نام خانوادگی": student.lastName,
        "کد ملی": student.nationalId,
        "شماره دانش‌آموزی": student.studentNumber,
        جنسیت: student.genderName,
        پایه: student.gradeName,
        رشته: student.fieldName,
        "واحد سازمانی": student.organizationalUnitName,
        استان: student.provinceName,
        منطقه: student.districtName,
        "شماره تماس": student.phoneNumber || "",
        "تاریخ تولد": student.birthDate
          ? new Date(student.birthDate).toLocaleDateString("fa-IR")
          : "",
        "تاریخ ثبت": new Date(student.createdAt).toLocaleDateString("fa-IR"),
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      worksheet["!cols"] = [
        { width: 8 }, // ردیف
        { width: 15 }, // نام
        { width: 20 }, // نام خانوادگی
        { width: 15 }, // کد ملی
        { width: 18 }, // شماره دانش‌آموزی
        { width: 10 }, // جنسیت
        { width: 15 }, // پایه
        { width: 20 }, // رشته
        { width: 25 }, // واحد سازمانی
        { width: 15 }, // استان
        { width: 15 }, // منطقه
        { width: 15 }, // شماره تماس
        { width: 12 }, // تاریخ تولد
        { width: 12 }, // تاریخ ثبت
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "نتایج جستجو");

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return new Response(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=student-search-results-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
        },
      });
    }

    // For regular search, add pagination
    const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

    // Execute aggregation
    const [students, totalCount] = await Promise.all([
      Student.aggregate(paginatedPipeline),
      Student.aggregate([{ $match: filter }, { $count: "total" }]),
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json(
      { success: false, message: "خطا در جستجوی دانش‌آموزان" },
      { status: 500 }
    );
  }
}
 