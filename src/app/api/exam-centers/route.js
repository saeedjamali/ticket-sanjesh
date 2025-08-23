import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ExamCenter from "@/models/ExamCenter";
import User from "@/models/User";
import District from "@/models/District";
import Gender from "@/models/Gender";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import OrganizationalUnitType from "@/models/OrganizationalUnitType";
import { ROLES, getRolePermissions } from "@/lib/permissions";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";

import jwt from "jsonwebtoken";
import { authService } from "@/lib/auth/authService";

// GET /api/exam-centers - Retrieve exam centers
export async function GET(request) {
  try {
    await connectDB();

    const user = await authService.validateToken(request);
    // console.log("GET /api/exam-centers - user:", user);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی پارامتر district در URL
    const { searchParams } = new URL(request.url);
    const districtParam = searchParams.get("district");

    console.log(
      "GET /api/exam-centers - searchParams:",
      Object.fromEntries(searchParams)
    );
    console.log("GET /api/exam-centers - district param:", districtParam);
    // console.log("GET /api/exam-centers - user role:", user.role);

    let query = {};

    // Define access levels based on user role
    switch (user.role) {
      case ROLES.SYSTEM_ADMIN:
      case "systemAdmin": // پشتیبانی از فرمت قدیمی
      case "generalManager":
        // Full access to all exam centers
        console.log("System admin or manager - full access granted");
        break;

      case ROLES.PROVINCE_EDUCATION_EXPERT:
      case ROLES.PROVINCE_TECH_EXPERT:
      case "provinceManager": // مدیر کل استان
      case "provinceAssessmentExpert": // کارشناس سنجش استان
      case "provinceTechnologyExpert": // کارشناس فناوری استان
        console.log("Province level access being processed");

        // اگر پارامتر district در URL وجود داشته باشد، فقط مراکز آن منطقه را برگردان
        if (districtParam && mongoose.Types.ObjectId.isValid(districtParam)) {
          console.log(
            `District filter applied from query param: ${districtParam}`
          );
          query.district = districtParam;
        }
        // در غیر این صورت، تمام واحدهای سازمانی استان را برگردان
        else if (user.province) {
          console.log(
            `Province filter applied for user's province: ${user.province}`
          );
          const provinceId =
            typeof user.province === "object"
              ? user.province._id
              : user.province;

          // Get all exam centers in districts of this province
          const provinceDistricts = await District.find({
            province: provinceId,
          }).select("_id");

          console.log(
            `Found ${provinceDistricts.length} districts in province`
          );
          query.district = { $in: provinceDistricts.map((d) => d._id) };
        } else {
          console.warn("User has province role but no province ID");
          return NextResponse.json(
            { success: false, error: "دسترسی به استان تعریف نشده است" },
            { status: 403 }
          );
        }
        break;

      case ROLES.DISTRICT_EDUCATION_EXPERT:
      case ROLES.DISTRICT_TECH_EXPERT:
      case "districtAssessmentExpert": // کارشناس سنجش منطقه
      case "districtTechnologyExpert": // کارشناس فناوری منطقه
        console.log("District level access being processed");

        // اگر پارامتر district در URL وجود داشته باشد، از آن استفاده کن
        if (districtParam && mongoose.Types.ObjectId.isValid(districtParam)) {
          console.log(`Using district ID from query param: ${districtParam}`);
          query.district = districtParam;
        }
        // در غیر این صورت، از منطقه کاربر استفاده کن
        else if (user.district) {
          console.log("Using district ID from user profile");
          const districtId =
            typeof user.district === "object"
              ? user.district._id
              : user.district;
          console.log(`District ID: ${districtId}`);
          query.district = districtId;
        } else {
          console.error("No district ID found in user profile or query params");
          return NextResponse.json(
            { success: false, error: "دسترسی به منطقه تعریف نشده است" },
            { status: 403 }
          );
        }
        break;

      case ROLES.EXAM_CENTER_MANAGER:
      case "examCenterManager": // مدیر واحد سازمانی
        console.log("Exam center manager access being processed");

        if (user.examCenter) {
          const examCenterId =
            typeof user.examCenter === "object"
              ? user.examCenter._id
              : user.examCenter;
          console.log(`Using exam center ID: ${examCenterId}`);
          query._id = examCenterId;
        } else {
          console.error("No exam center ID found in user profile");
          return NextResponse.json(
            { success: false, error: "دسترسی به واحد سازمانی تعریف نشده است" },
            { status: 403 }
          );
        }
        break;

      default:
        console.error(`Unrecognized role: ${user.role}`);
        return NextResponse.json(
          { success: false, error: "نقش کاربری نامعتبر است" },
          { status: 403 }
        );
    }

    console.log("Final query for exam centers:", JSON.stringify(query));

    const examCenters = await ExamCenter.find(query)
      .populate({
        path: "district",
        select: "name province",
        populate: {
          path: "province",
          select: "name code",
        },
      })
      .populate("manager", "fullName")
      .populate("gender", "genderCode genderTitle")
      .populate("course", "courseCode courseName")
      .populate("branch", "branchCode branchTitle")
      .populate("organizationType", "unitTypeCode unitTypeTitle")
      .sort({ name: 1 })
      .select(
        "name code district manager capacity address phone gender course branch studentCount organizationType createdAt"
      );

    console.log(`Found ${examCenters.length} exam centers`);

    return NextResponse.json({
      success: true,
      examCenters,
    });
  } catch (error) {
    console.error("Error in GET /api/exam-centers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در دریافت اطلاعات واحدهای سازمانی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// POST /api/exam-centers - Create a new exam center
export async function POST(request) {
  try {
    await connectDB();

    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // Only certain roles can create exam centers
    if (
      !["systemAdmin", "generalManager", "provinceManager"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجوز ایجاد واحد سازمانی را ندارید" },
        { status: 403 }
      );
    }

    const {
      name,
      code,
      districtId,
      manager,
      capacity,
      address,
      phone,
      gender,
      course,
      branch,
      studentCount,
      organizationType,
      geographicalLocation,
    } = await request.json();

    // Validate required fields
    if (
      !name?.trim() ||
      !code?.trim() ||
      !districtId ||
      !gender ||
      !course ||
      !branch ||
      !organizationType ||
      !geographicalLocation
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "نام، کد، منطقه، جنسیت، دوره، شاخه، نوع واحد سازمانی و موقعیت جغرافیایی الزامی است",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId fields
    if (!mongoose.Types.ObjectId.isValid(gender)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه جنسیت نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(course)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه دوره نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(branch)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه شاخه نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(organizationType)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه نوع واحد سازمانی نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (studentCount && (isNaN(studentCount) || Number(studentCount) < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "تعداد دانش آموز باید عدد مثبت باشد",
        },
        { status: 400 }
      );
    }

    // Validate geographical location
    const validLocations = ["شهری", "روستایی", "خارج کشور"];
    if (!validLocations.includes(geographicalLocation)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "موقعیت جغرافیایی باید یکی از مقادیر شهری، روستایی یا خارج کشور باشد",
        },
        { status: 400 }
      );
    }

    // Check if user has access to this district
    const district = await District.findById(districtId).populate("province");
    if (!district) {
      return NextResponse.json(
        { success: false, error: "منطقه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Province manager can only create exam centers in their province
    if (
      user.role === "provinceManager" &&
      district.province._id.toString() !== user.province._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "شما مجوز ایجاد واحد سازمانی در این منطقه را ندارید",
        },
        { status: 403 }
      );
    }

    // Check for duplicate code
    const existingCenter = await ExamCenter.findOne({ code: code.trim() });
    if (existingCenter) {
      return NextResponse.json(
        { success: false, error: "کد واحد سازمانی تکراری است" },
        { status: 400 }
      );
    }

    const examCenter = new ExamCenter({
      name: name.trim(),
      code: code.trim(),
      district: districtId,
      manager: manager || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      address: address || undefined,
      phone: phone || undefined,
      gender: gender,
      course: course,
      branch: branch,
      studentCount: studentCount ? Number(studentCount) : undefined,
      organizationType: organizationType,
      geographicalLocation: geographicalLocation,
      createdAt: new Date(),
      createdBy: user.id,
    });

    await examCenter.save();

    // Populate the response with correct fields
    await examCenter.populate([
      { path: "district", select: "name" },
      { path: "manager", select: "name" },
      { path: "gender", select: "genderCode genderTitle" },
      { path: "course", select: "courseCode courseName" },
      { path: "branch", select: "branchCode branchTitle" },
      { path: "organizationType", select: "unitTypeCode unitTypeTitle" },
    ]);

    return NextResponse.json({
      success: true,
      examCenter,
    });
  } catch (error) {
    console.error("Error in POST /api/exam-centers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در ایجاد واحد سازمانی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// PUT /api/exam-centers/[id] - Update an exam center
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // Only certain roles can update exam centers
    if (
      !["systemAdmin", "generalManager", "provinceManager"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجوز ویرایش واحد سازمانی را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه واحد سازمانی الزامی است" },
        { status: 400 }
      );
    }

    const {
      name,
      code,
      districtId,
      managerId,
      capacity,
      address,
      phone,
      gender,
      course,
      branch,
      studentCount,
      organizationType,
    } = await request.json();
    if (
      !name?.trim() ||
      !code?.trim() ||
      !districtId ||
      !capacity ||
      !gender ||
      !course ||
      !branch ||
      !organizationType
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "نام، کد، منطقه، ظرفیت، جنسیت، دوره، شاخه و نوع واحد سازمانی الزامی است",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId fields
    if (!mongoose.Types.ObjectId.isValid(gender)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه جنسیت نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(course)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه دوره نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(branch)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه شاخه نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(organizationType)) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه نوع واحد سازمانی نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (studentCount && (isNaN(studentCount) || Number(studentCount) < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "تعداد دانش آموز باید عدد مثبت باشد",
        },
        { status: 400 }
      );
    }

    const examCenter = await ExamCenter.findById(id);
    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user has access to this district
    const district = await District.findById(districtId).populate("province");
    if (!district) {
      return NextResponse.json(
        { success: false, error: "منطقه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Province manager can only update exam centers in their province
    if (
      user.role === "provinceManager" &&
      district.province._id.toString() !== user.province._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "شما مجوز ویرایش واحد سازمانی در این منطقه را ندارید",
        },
        { status: 403 }
      );
    }

    // Check for duplicate code
    if (code.trim() !== examCenter.code) {
      const existingCenter = await ExamCenter.findOne({ code: code.trim() });
      if (existingCenter) {
        return NextResponse.json(
          { success: false, error: "کد واحد سازمانی تکراری است" },
          { status: 400 }
        );
      }
    }

    examCenter.name = name.trim();
    examCenter.code = code.trim();
    examCenter.district = districtId;
    examCenter.manager = managerId;
    examCenter.capacity = Number(capacity);
    examCenter.address = address || undefined;
    examCenter.phone = phone || undefined;
    examCenter.gender = gender;
    examCenter.course = course;
    examCenter.branch = branch;
    examCenter.studentCount = studentCount ? Number(studentCount) : undefined;
    examCenter.organizationType = organizationType;
    examCenter.updatedAt = new Date();
    examCenter.updatedBy = user.id;

    await examCenter.save();

    // Populate the response
    await examCenter.populate([
      { path: "district", select: "name" },
      { path: "manager", select: "fullName" },
      { path: "gender", select: "genderCode genderTitle" },
      { path: "course", select: "courseCode courseName" },
      { path: "branch", select: "branchCode branchTitle" },
      { path: "organizationType", select: "unitTypeCode unitTypeTitle" },
    ]);

    return NextResponse.json({
      success: true,
      examCenter,
    });
  } catch (error) {
    console.error("Error in PUT /api/exam-centers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در بروزرسانی واحد سازمانی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}

// DELETE /api/exam-centers/[id] - Delete an exam center
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const user = await authService.validateToken(request);
    console.log("user--->", user);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // Only certain roles can delete exam centers
    if (
      !["systemAdmin", "generalManager", "provinceManager"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجوز حذف واحد سازمانی را ندارید" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه واحد سازمانی الزامی است" },
        { status: 400 }
      );
    }

    const examCenter = await ExamCenter.findById(id).populate({
      path: "district",
      populate: { path: "province" },
    });

    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // Province manager can only delete exam centers in their province
    if (
      user.role === "provinceManager" &&
      examCenter.district.province._id.toString() !==
        user.province._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "شما مجوز حذف واحد سازمانی در این منطقه را ندارید",
        },
        { status: 403 }
      );
    }

    await examCenter.deleteOne();

    return NextResponse.json({
      success: true,
      message: "واحد سازمانی با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/exam-centers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در حذف واحد سازمانی",
      },
      { status: error.message.includes("عدم احراز هویت") ? 401 : 500 }
    );
  }
}
