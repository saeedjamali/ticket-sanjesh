import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ExamCenter from "@/models/ExamCenter";
import User from "@/models/User";
import { ROLES, getRolePermissions } from "@/lib/permissions";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";

import jwt from "jsonwebtoken";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";

// GET /api/exam-centers - Retrieve exam centers
export async function GET(request) {
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

    let query = {};
    // Define access levels based on user role
    switch (user.role) {
      case "systemAdmin":
      case "generalManager":
        // Full access to all exam centers
        break;
      case "provinceManager": // مدیر کل استان
      case "provinceAssessmentExpert": // کارشناس سنجش استان
      case "provinceTechnologyExpert": // کارشناس فناوری استان
        if (!user.province?._id) {
          return NextResponse.json(
            { success: false, error: "دسترسی به استان تعریف نشده است" },
            { status: 403 }
          );
        }
        // Get all exam centers in districts of this province
        const provinceDistricts = await District.find({
          province: user.province._id,
        }).select("_id");
        query.district = { $in: provinceDistricts.map((d) => d._id) };
        break;
      case "districtAssessmentExpert": // کارشناس سنجش منطقه
      case "districtTechnologyExpert": // کارشناس فناوری منطقه
        if (!user.district?._id) {
          return NextResponse.json(
            { success: false, error: "دسترسی به منطقه تعریف نشده است" },
            { status: 403 }
          );
        }
        query.district = user.district._id;
        break;
      case "examCenterManager": // مدیر واحد سازمانی
        if (!user.examCenter?._id) {
          return NextResponse.json(
            { success: false, error: "دسترسی به واحد سازمانی تعریف نشده است" },
            { status: 403 }
          );
        }
        query._id = user.examCenter._id;
        break;
      default:
        return NextResponse.json(
          { success: false, error: "نقش کاربری نامعتبر است" },
          { status: 403 }
        );
    }

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
      .sort({ name: 1 })
      .select(
        "name code district manager capacity address phone gender period studentCount organizationType createdAt"
      );

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
      period,
      studentCount,
      organizationType,
    } = await request.json();

    // Validate required fields
    if (!name?.trim() || !code?.trim() || !districtId) {
      return NextResponse.json(
        {
          success: false,
          error: "نام، کد و منطقه واحد سازمانی الزامی است",
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
      gender: gender || undefined,
      period: period || undefined,
      studentCount: studentCount ? Number(studentCount) : undefined,
      organizationType: organizationType || undefined,
      createdAt: new Date(),
      createdBy: user.id,
    });

    await examCenter.save();

    // Populate the response with correct fields
    await examCenter.populate([
      { path: "district", select: "name" },
      { path: "manager", select: "name" },
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
    if (!name?.trim() || !code?.trim() || !districtId) {
      return NextResponse.json(
        {
          success: false,
          error: "نام، کد و منطقه واحد سازمانی الزامی است",
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
    examCenter.manager = managerId || undefined;
    examCenter.capacity = capacity ? Number(capacity) : undefined;
    examCenter.address = address || undefined;
    examCenter.phone = phone || undefined;
    examCenter.gender = gender || undefined;
    examCenter.course = course || undefined;
    examCenter.branch = branch || undefined;
    examCenter.studentCount = studentCount ? Number(studentCount) : undefined;
    examCenter.organizationType = organizationType || undefined;
    examCenter.updatedAt = new Date();
    examCenter.updatedBy = user.id;

    await examCenter.save();

    // Populate the response
    await examCenter.populate([
      {
        path: "district",
        select: "name province",
        populate: {
          path: "province",
          select: "name code",
        },
      },
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
