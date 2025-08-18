import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SmartSchool from "@/models/SmartSchool";
import ExamCenter from "@/models/ExamCenter";
import ExamCenterStats from "@/models/ExamCenterStats";
import District from "@/models/District";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function GET(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }
    console.log("user---->", user);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const examCenterCode = searchParams.get("examCenterCode");

    let query = {};

    // محدودیت دسترسی براساس نقش کاربر
    if (
      user.role === ROLES.EXAM_CENTER_MANAGER ||
      user.role === "examCenterManager"
    ) {
      // برای مدیر مرکز، باید کد مرکز را از examCenter object بگیریم
      if (user.examCenter) {
        const examCenter = await ExamCenter.findById(user.examCenter);
        if (examCenter) {
          query.examCenterCode = examCenter.code;
        }
      }
    } else if (
      user.role === ROLES.DISTRICT_TECH_EXPERT ||
      user.role === "districtTechExpert"
    ) {
      if (user.district) {
        const district = await District.findById(user.district);
        if (district) {
          query.districtCode = district.code;
        }
      }
    } else if (
      user.role === ROLES.PROVINCE_TECH_EXPERT ||
      user.role === "provinceTechExpert"
    ) {
      if (user.province) {
        const province = await Province.findById(user.province);
        if (province) {
          query.provinceCode = province.code;
        }
      }
    }

    if (
      examCenterCode &&
      ["DISTRICT_TECH_EXPERT", "PROVINCE_TECH_EXPERT"].includes(user.role)
    ) {
      query.examCenterCode = examCenterCode;
    }

    const smartSchools = await SmartSchool.find(query)
      .populate("createdBy", "fullName")
      .populate("updatedBy", "fullName")
      .sort({ lastUpdate: -1 });

    return NextResponse.json({
      success: true,
      data: smartSchools,
    });
  } catch (error) {
    console.error("Error fetching smart school data:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات مدرسه هوشمند" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی مجاز به ثبت اطلاعات هستند
    if (
      user.role !== ROLES.EXAM_CENTER_MANAGER &&
      user.role !== "examCenterManager"
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به ثبت اطلاعات نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const data = await req.json();

    // دریافت اطلاعات واحد سازمانی کاربر
    const examCenter = await ExamCenter.findById(user.examCenter).populate({
      path: "district",
      populate: { path: "province" },
    });

    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود اطلاعات قبلی
    const existingRecord = await SmartSchool.findOne({
      examCenterCode: examCenter.code,
    });

    if (existingRecord) {
      return NextResponse.json(
        { success: false, error: "اطلاعات مدرسه هوشمند قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // بررسی وجود user ID
    const userId = user._id || user.id || user.toString();
    if (!userId) {
      console.error("User ID not found in user object:", user);
      return NextResponse.json(
        { success: false, error: "شناسه کاربر یافت نشد" },
        { status: 400 }
      );
    }

    // ایجاد رکورد جدید
    const smartSchoolData = {
      ...data,
      examCenterCode: examCenter.code,
      districtCode: examCenter.district.code,
      provinceCode: examCenter.district.province.code,
      createdBy: userId,
    };

    console.log("Data received from frontend:", JSON.stringify(data, null, 2));
    console.log(
      "Smart school data to save:",
      JSON.stringify(smartSchoolData, null, 2)
    );

    // اعتبارسنجی دستی قبل از ایجاد
    const totalClassrooms = parseInt(data.totalClassrooms) || 0;
    const smartClassrooms = parseInt(data.smartClassrooms) || 0;

    console.log(
      `Validation check for POST: totalClassrooms=${totalClassrooms}, smartClassrooms=${smartClassrooms}`
    );

    if (totalClassrooms > 0 && smartClassrooms > totalClassrooms) {
      console.log(
        "Validation failed for POST: smartClassrooms > totalClassrooms"
      );
      return NextResponse.json(
        {
          success: false,
          error: `خطا: ${smartClassrooms} بیشتر از ${totalClassrooms} است!`,
        },
        { status: 400 }
      );
    }

    const smartSchool = new SmartSchool(smartSchoolData);
    await smartSchool.save();

    console.log(
      "Smart school saved successfully with score:",
      smartSchool.smartSchoolScore
    );
    console.log("Improvement priorities:", smartSchool.improvementPriorities);

    return NextResponse.json({
      success: true,
      data: smartSchool,
      message: `🎉 اطلاعات مدرسه هوشمند با موفقیت ثبت شد! امتیاز شما: ${smartSchool.smartSchoolScore}/100`,
    });
  } catch (error) {
    console.error("Error creating smart school record:", error);

    // نمایش خطای دقیق validation
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          error: `خطای اعتبارسنجی: ${validationErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `خطا در ثبت: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی مجاز به ویرایش اطلاعات هستند
    if (
      user.role !== ROLES.EXAM_CENTER_MANAGER &&
      user.role !== "examCenterManager"
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به ویرایش اطلاعات نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const data = await req.json();

    // دریافت کد مرکز از examCenter object
    const examCenter = await ExamCenter.findById(user.examCenter);
    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    const smartSchool = await SmartSchool.findOne({
      examCenterCode: examCenter.code,
    });

    if (!smartSchool) {
      return NextResponse.json(
        { success: false, error: "اطلاعات مدرسه هوشمند یافت نشد" },
        { status: 404 }
      );
    }

    // بروزرسانی اطلاعات
    console.log(
      "Data received from frontend for update:",
      JSON.stringify(data, null, 2)
    );
    console.log(
      "Smart school before update:",
      JSON.stringify(smartSchool.toObject(), null, 2)
    );

    // اعتبارسنجی دستی قبل از بروزرسانی
    const totalClassrooms = parseInt(data.totalClassrooms) || 0;
    const smartClassrooms = parseInt(data.smartClassrooms) || 0;

    console.log(
      `Validation check: totalClassrooms=${totalClassrooms}, smartClassrooms=${smartClassrooms}`
    );

    if (totalClassrooms > 0 && smartClassrooms > totalClassrooms) {
      console.log("Validation failed: smartClassrooms > totalClassrooms");
      return NextResponse.json(
        {
          success: false,
          error: `خطا: ${smartClassrooms} بیشتر از ${totalClassrooms} است!`,
        },
        { status: 400 }
      );
    }

    Object.assign(smartSchool, data);
    smartSchool.updatedBy = user._id || user.id;
    await smartSchool.save();

    console.log(
      "Smart school after update:",
      JSON.stringify(smartSchool.toObject(), null, 2)
    );

    console.log(
      "Smart school updated successfully with score:",
      smartSchool.smartSchoolScore
    );
    console.log("Improvement priorities:", smartSchool.improvementPriorities);

    return NextResponse.json({
      success: true,
      data: smartSchool,
      message: `✅ اطلاعات مدرسه هوشمند با موفقیت بروزرسانی شد! امتیاز جدید: ${smartSchool.smartSchoolScore}/100`,
    });
  } catch (error) {
    console.error("Error updating smart school record:", error);

    // نمایش خطای دقیق validation
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          error: `خطای اعتبارسنجی: ${validationErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `خطا در بروزرسانی: ${error.message}` },
      { status: 500 }
    );
  }
}
