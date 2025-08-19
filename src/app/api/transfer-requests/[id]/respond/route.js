import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import TransferRequest from "@/models/TransferRequest";
import Student from "@/models/Student";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import mongoose from "mongoose";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

export async function POST(req, { params }) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - مدیران مدارس، کارشناسان استانی و منطقه‌ای
    const allowedRoles = [
      ROLES.EXAM_CENTER_MANAGER,
      "examCenterManager",
      ROLES.PROVINCE_REGISTRATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.DISTRICT_REGISTRATION_EXPERT,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "شما مجاز به پاسخ درخواست‌های جابجایی نیستید",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = params;
    const { action, responseDescription = "" } = await req.json();

    // اعتبارسنجی ورودی‌ها
    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "عملیات نامعتبر است" },
        { status: 400 }
      );
    }

    // یافتن درخواست جابجایی
    const transferRequest = await TransferRequest.findById(id);
    if (!transferRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست جابجایی یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی بر اساس نقش کاربر
    const isProvinceExpert = [
      ROLES.PROVINCE_REGISTRATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
    ].includes(user.role);

    const isDistrictExpert = [ROLES.DISTRICT_REGISTRATION_EXPERT].includes(
      user.role
    );

    if (isProvinceExpert) {
      // کارشناسان استانی می‌توانند به درخواست‌های استان خود پاسخ دهند
      let userProvinceCode = user.province?.code || user.province;

      // اگر province یک ObjectId است، کد آن را از دیتابیس بگیریم
      if (mongoose.Types.ObjectId.isValid(userProvinceCode)) {
        try {
          const province = await Province.findById(userProvinceCode)
            .select("code")
            .lean();
          if (province) {
            userProvinceCode = province.code;
          }
        } catch (provinceError) {
          console.error(
            "Error fetching province code for respond:",
            provinceError
          );
        }
      }

      if (!userProvinceCode) {
        return NextResponse.json(
          { success: false, error: "کد استان یافت نشد" },
          { status: 400 }
        );
      }

      // بررسی اینکه درخواست مربوط به استان کاربر است (فقط toSchool)
      const isAuthorized =
        transferRequest.toSchool.provinceCode === userProvinceCode;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "شما مجاز به پاسخ این درخواست نیستید" },
          { status: 403 }
        );
      }
    } else if (isDistrictExpert) {
      // کارشناسان منطقه می‌توانند به درخواست‌های منطقه خود پاسخ دهند
      let userDistrictCode = user.district?.code || user.district;

      // اگر district یک ObjectId است، کد آن را از دیتابیس بگیریم
      if (mongoose.Types.ObjectId.isValid(userDistrictCode)) {
        try {
          const district = await District.findById(userDistrictCode)
            .select("code")
            .lean();
          if (district) {
            userDistrictCode = district.code;
          }
        } catch (districtError) {
          console.error(
            "Error fetching district code for respond:",
            districtError
          );
        }
      }

      if (!userDistrictCode) {
        return NextResponse.json(
          { success: false, error: "کد منطقه یافت نشد" },
          { status: 400 }
        );
      }

      // بررسی اینکه درخواست مربوط به منطقه کاربر است (فقط toSchool)
      const isAuthorized =
        transferRequest.toSchool.districtCode === userDistrictCode;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "شما مجاز به پاسخ این درخواست نیستید" },
          { status: 403 }
        );
      }
    } else {
      // مدیران مدارس فقط می‌توانند به درخواست‌های مدرسه خود پاسخ دهند
      let userOrgCode =
        user.organizationalUnit?.code ||
        user.organizationalUnitCode ||
        user.organizationCode ||
        user.orgCode ||
        user.examCenter?.code;

      // اگر examCenter یک ObjectId است، باید کد آن را از دیتابیس بگیریم
      if (
        !userOrgCode &&
        user.examCenter &&
        mongoose.Types.ObjectId.isValid(user.examCenter)
      ) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter)
            .select("code")
            .lean();
          if (examCenter) {
            userOrgCode = examCenter.code;
          }
        } catch (examCenterError) {
          console.error(
            "Error fetching examCenter for respond:",
            examCenterError
          );
        }
      }

      // fallback برای examCenter ObjectId string
      if (
        !userOrgCode &&
        user.examCenter &&
        typeof user.examCenter === "string" &&
        mongoose.Types.ObjectId.isValid(user.examCenter)
      ) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter)
            .select("code")
            .lean();
          if (examCenter) {
            userOrgCode = examCenter.code;
          }
        } catch (examCenterError) {
          console.error(
            "Error fetching examCenter (fallback) for respond:",
            examCenterError
          );
        }
      }

      if (transferRequest.toSchool.organizationalUnitCode !== userOrgCode) {
        return NextResponse.json(
          { success: false, error: "شما مجاز به پاسخ این درخواست نیستید" },
          { status: 403 }
        );
      }
    }

    // بررسی وضعیت درخواست
    if (transferRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "این درخواست قبلاً پاسخ داده شده است" },
        { status: 400 }
      );
    }

    // پردازش بر اساس نوع عملیات
    if (action === "approve") {
      // تایید درخواست و انتقال دانش‌آموز
      await transferRequest.approve(user._id || user.id, responseDescription);

      // یافتن دانش‌آموز و انتقال به مدرسه مبدا
      const student = await Student.findOne({
        nationalId: transferRequest.studentNationalId,
        academicYear: transferRequest.academicYear,
      });

      if (student) {
        // بروزرسانی اطلاعات دانش‌آموز
        student.organizationalUnitCode =
          transferRequest.fromSchool.organizationalUnitCode;
        student.districtCode = transferRequest.fromSchool.districtCode;
        student.transferredAt = new Date();
        student.transferredFrom =
          transferRequest.toSchool.organizationalUnitCode;
        student.transferReason = "درخواست جابجایی تایید شده";

        await student.save();

        return NextResponse.json({
          success: true,
          message: "درخواست جابجایی تایید شد و دانش‌آموز با موفقیت منتقل شد",
          data: {
            studentName: `${student.firstName} ${student.lastName}`,
            transferredTo: transferRequest.fromSchool.schoolName,
          },
        });
      } else {
        // اگر دانش‌آموز یافت نشد، فقط درخواست را تایید کن
        return NextResponse.json({
          success: true,
          message: "درخواست جابجایی تایید شد اما دانش‌آموز یافت نشد",
          warning: "لطفا با مدیر سیستم تماس بگیرید",
        });
      }
    } else {
      // رد درخواست
      await transferRequest.reject(user._id || user.id, responseDescription);

      return NextResponse.json({
        success: true,
        message: "درخواست جابجایی رد شد",
        data: {
          studentName: `${transferRequest.studentInfo.firstName} ${transferRequest.studentInfo.lastName}`,
          rejectedFor: transferRequest.fromSchool.schoolName,
        },
      });
    }
  } catch (error) {
    console.error("Error responding to transfer request:", error);
    return NextResponse.json(
      { success: false, error: "خطا در پردازش پاسخ درخواست جابجایی" },
      { status: 500 }
    );
  }
}
