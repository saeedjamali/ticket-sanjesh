import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import CorrectionRequest from "@/models/CorrectionRequest";
import ExamCenterStats from "@/models/ExamCenterStats";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import User from "@/models/User";
import dbConnect from "@/lib/dbConnect";

// دریافت یک درخواست مشخص (GET)
export async function GET(request, { params }) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id: requestId } = params;

    // پیدا کردن درخواست
    const correctionRequest = await CorrectionRequest.findById(requestId)
      .populate("requestedBy", "fullName phone")
      .populate("districtReviewedBy", "fullName")
      .populate("provinceReviewedBy", "fullName");

    if (!correctionRequest) {
      return NextResponse.json(
        { success: false, message: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی
    let hasAccess = false;
    if (user.role === "districtRegistrationExpert") {
      const district = await District.findById(user.district);
      hasAccess = district && district.code === correctionRequest.districtCode;
    } else if (user.role === "provinceRegistrationExpert") {
      const province = await Province.findById(user.province);
      hasAccess = province && province.code === correctionRequest.provinceCode;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "شما مجاز به مشاهده این درخواست نیستید" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: correctionRequest,
    });
  } catch (error) {
    console.error("خطا در دریافت درخواست:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت درخواست" },
      { status: 500 }
    );
  }
}

// تایید/رد درخواست (PUT)
export async function PUT(request, { params }) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    // فقط کارشناسان ثبت نام می‌توانند تایید/رد کنند
    if (
      !["districtRegistrationExpert", "provinceRegistrationExpert"].includes(
        user.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "فقط کارشناسان ثبت نام مجاز به بررسی درخواست هستند",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id: requestId } = params;
    const { action, response } = await request.json();

    // تبدیل action به status
    const status = action === "approve" ? "approved" : "rejected";
    const rejectionReason = status === "rejected" ? response : null;

    // اعتبارسنجی داده‌ها
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "عمل نامعتبر" },
        { status: 400 }
      );
    }

    if (action === "reject" && (!response || response.trim().length < 5)) {
      return NextResponse.json(
        { success: false, message: "دلیل رد باید حداقل 5 کاراکتر باشد" },
        { status: 400 }
      );
    }

    // پیدا کردن درخواست
    const correctionRequest = await CorrectionRequest.findById(requestId);
    if (!correctionRequest) {
      return NextResponse.json(
        { success: false, message: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وضعیت درخواست بر اساس نوع کاربر
    if (user.role === "districtRegistrationExpert") {
      if (correctionRequest.status !== "pending") {
        return NextResponse.json(
          { success: false, message: "این درخواست قبلاً بررسی شده است" },
          { status: 400 }
        );
      }
    } else if (user.role === "provinceRegistrationExpert") {
      if (!["approved_district"].includes(correctionRequest.status)) {
        return NextResponse.json(
          {
            success: false,
            message: "این درخواست هنوز آماده بررسی توسط استان نیست",
          },
          { status: 400 }
        );
      }
    }

    // بررسی دسترسی و تعیین نوع کاربر
    let hasAccess = false;
    let userType = null;

    if (user.role === "districtRegistrationExpert") {
      const district = await District.findById(user.district);
      hasAccess = district && district.code === correctionRequest.districtCode;
      userType = "district";
    } else if (user.role === "provinceRegistrationExpert") {
      const province = await Province.findById(user.province);
      hasAccess = province && province.code === correctionRequest.provinceCode;
      userType = "province";
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          message: "شما مجاز به بررسی این درخواست نیستید",
        },
        { status: 403 }
      );
    }

    // به‌روزرسانی درخواست بر اساس نوع کاربر
    if (userType === "district") {
      // کارشناس منطقه
      if (action === "approve") {
        correctionRequest.status = "approved_district";
        correctionRequest.districtResponse = response || "تایید شد";
      } else {
        correctionRequest.status = "rejected";
        correctionRequest.districtResponse = response;
      }
      correctionRequest.districtReviewedBy = user.id;
      correctionRequest.districtReviewedAt = new Date();
    } else if (userType === "province") {
      // کارشناس استان
      if (action === "approve") {
        correctionRequest.status = "approved_province";
        correctionRequest.isApplied = true;
        correctionRequest.appliedAt = new Date();
      } else {
        correctionRequest.status = "rejected";
      }
      correctionRequest.provinceReviewedBy = user.id;
      correctionRequest.provinceReviewedAt = new Date();
      correctionRequest.provinceResponse = response;
    }

    await correctionRequest.save();

    // اگر درخواست توسط استان تایید شد، آمار واحد سازمانی را به‌روزرسانی کن
    if (userType === "province" && action === "approve") {
      console.log(
        "correctionRequest.examCenterCode-------->",
        correctionRequest.examCenterCode
      );

      const stats = await ExamCenterStats.findOne({
        organizationalUnitCode: correctionRequest.examCenterCode,
        academicYear: correctionRequest.academicYear,
      });

      if (stats) {
        // محاسبه تفاوت
        const difference =
          correctionRequest.correctedStudentCount -
          correctionRequest.currentStudentCount;

        // به‌روزرسانی آمار
        stats.totalStudents = correctionRequest.correctedStudentCount;
        stats.updatedBy = user.id;

        console.log("قبل از save - stats:", {
          totalStudents: stats.totalStudents,
          correctedStudentCount: correctionRequest.correctedStudentCount,
        });

        const savedStats = await stats.save();
        console.log("بعد از save - totalStudents:", savedStats.totalStudents);
      }
    }

    // بازگرداندن درخواست به‌روزرسانی شده
    const updatedRequest = await CorrectionRequest.findById(requestId)
      .populate("requestedBy", "fullName phone")
      .populate("districtReviewedBy", "fullName")
      .populate("provinceReviewedBy", "fullName");

    // تعیین پیام مناسب
    let message = "";
    if (action === "approve") {
      if (userType === "district") {
        message =
          "✅ درخواست اصلاح آمار توسط کارشناس ثبت نام منطقه تایید شد و به مرحله بررسی کارشناس ثبت نام استان ارسال گردید";
      } else {
        message =
          "🎉 درخواست اصلاح آمار توسط کارشناس ثبت نام استان تایید و در سیستم اعمال شد. آمار واحد سازمانی به‌روزرسانی گردید";
      }
    } else {
      if (userType === "district") {
        message = "❌ درخواست اصلاح آمار توسط کارشناس ثبت نام منطقه رد شد";
      } else {
        message = "❌ درخواست اصلاح آمار توسط کارشناس ثبت نام استان رد شد";
      }
    }

    return NextResponse.json({
      success: true,
      message: message,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("خطا در بررسی درخواست:", error);
    return NextResponse.json(
      { success: false, message: "خطا در بررسی درخواست" },
      { status: 500 }
    );
  }
}
