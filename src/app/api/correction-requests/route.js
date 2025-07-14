import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";
import CorrectionRequest from "@/models/CorrectionRequest";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import AcademicYear from "@/models/AcademicYear";
import User from "@/models/User";
import dbConnect from "@/lib/dbConnect";

// ایجاد درخواست جدید (POST)
export async function POST(request) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی می‌توانند درخواست ایجاد کنند
    if (user.role !== "examCenterManager") {
      return NextResponse.json(
        {
          success: false,
          message: "فقط مدیران واحد سازمانی مجاز به ایجاد درخواست هستند",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { currentStudentCount, correctedStudentCount, reason } =
      await request.json();

    // اعتبارسنجی داده‌ها
    if (!currentStudentCount || !correctedStudentCount || !reason) {
      return NextResponse.json(
        { success: false, message: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    if (currentStudentCount < 0 || correctedStudentCount < 0) {
      return NextResponse.json(
        { success: false, message: "تعداد دانش‌آموز نمی‌تواند منفی باشد" },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { success: false, message: "توضیح باید حداقل 10 کاراکتر باشد" },
        { status: 400 }
      );
    }

    // دریافت اطلاعات کامل کاربر
    const fullUser = await User.findById(user.id);

    if (!fullUser) {
      return NextResponse.json(
        { success: false, message: "اطلاعات کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت اطلاعات واحد سازمانی
    const examCenter = await ExamCenter.findById(user.examCenter)
      .populate("district")
      .populate({
        path: "district",
        populate: { path: "province" },
      });

    if (!examCenter) {
      return NextResponse.json(
        { success: false, message: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت سال تحصیلی قبل
    const currentYear = await AcademicYear.findOne({ isActive: true });
    if (!currentYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    const currentYearNumber = parseInt(currentYear.name.split("-")[0]);
    const previousYearName = `${currentYearNumber - 1}-${currentYearNumber}`;

    // پیدا کردن آمار سال قبل
    const previousYearStats = await ExamCenterStats.findOne({
      organizationalUnitCode: examCenter.code,
      academicYear: previousYearName,
    });

    if (!previousYearStats) {
      return NextResponse.json(
        { success: false, message: "آمار سال قبل یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی اینکه آیا درخواست قبلی در انتظار وجود دارد
    const existingRequest = await CorrectionRequest.findOne({
      examCenterCode: examCenter.code,
      academicYear: previousYearName,
      status: { $in: ["pending", "approved_district"] },
      isActive: true,
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, message: "شما درخواست در انتظار بررسی دارید" },
        { status: 400 }
      );
    }

    // ایجاد درخواست جدید
    const correctionRequest = new CorrectionRequest({
      currentStudentCount,
      correctedStudentCount,
      reason,
      examCenterCode: examCenter.code,
      examCenterName: examCenter.name,
      districtCode: examCenter.district.code,
      districtName: examCenter.district.name,
      provinceCode: examCenter.district.province.code,
      provinceName: examCenter.district.province.name,
      academicYear: previousYearName,
      requestedBy: fullUser._id,
      requestedByName:
        fullUser.fullName || `${fullUser.firstName} ${fullUser.lastName}`,
      requestedByPhone: fullUser.phone || fullUser.phoneNumber || "نامشخص",
      originalStatsId: previousYearStats._id,
    });

    await correctionRequest.save();

    return NextResponse.json({
      success: true,
      message: "درخواست اصلاح با موفقیت ارسال شد",
      data: correctionRequest,
    });
  } catch (error) {
    console.error("Error creating correction request:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد درخواست" },
      { status: 500 }
    );
  }
}

// دریافت لیست درخواست‌ها (GET)
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let requests = [];

    if (user.role === "examCenterManager") {
      // مدیر واحد سازمانی فقط درخواست‌های خودش را می‌بیند
      const filter = { requestedBy: user.id, isActive: true };
      if (status) filter.status = status;

      requests = await CorrectionRequest.find(filter)
        .populate("districtReviewedBy", "fullName")
        .populate("provinceReviewedBy", "fullName")
        .sort({ createdAt: -1 });
    } else if (user.role === "districtRegistrationExpert") {
      // کارشناس ثبت نام منطقه درخواست‌های منطقه خودش را می‌بیند
      const district = await District.findById(user.district);
      if (!district) {
        return NextResponse.json(
          { success: false, message: "اطلاعات منطقه یافت نشد" },
          { status: 404 }
        );
      }

      requests = await CorrectionRequest.getDistrictRequests(
        district.code,
        status
      );
    } else if (user.role === "provinceRegistrationExpert") {
      // کارشناس ثبت نام استان درخواست‌های استان خودش را می‌بیند
      const province = await Province.findById(user.province);
      if (!province) {
        return NextResponse.json(
          { success: false, message: "اطلاعات استان یافت نشد" },
          { status: 404 }
        );
      }

      requests = await CorrectionRequest.getProvinceRequests(
        province.code,
        status
      );
    } else {
      return NextResponse.json(
        { success: false, message: "دسترسی غیر مجاز" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching correction requests:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت درخواست‌ها" },
      { status: 500 }
    );
  }
}
