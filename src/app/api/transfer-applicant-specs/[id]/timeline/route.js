import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// دریافت timeline یک مشخصات پرسنل
export async function GET(request, { params }) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![
        ROLES.SYSTEM_ADMIN,
        ROLES.PROVINCE_TRANSFER_EXPERT,
        ROLES.DISTRICT_TRANSFER_EXPERT,
        ROLES.TRANSFER_APPLICANT,
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { id } = params;

    await connectDB();

    const spec = await TransferApplicantSpec.findById(id).populate([
      {
        path: "statusLog.performedBy",
        select: "fullName role nationalId",
      },
    ]);

    if (!spec) {
      return NextResponse.json(
        { success: false, error: "مشخصات پرسنل یافت نشد" },
        { status: 404 }
      );
    }

    // برای transferApplicant فقط مشخصات خودش
    if (
      userAuth.role === ROLES.TRANSFER_APPLICANT &&
      spec.nationalId !== userAuth.nationalId
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی به این مشخصات" },
        { status: 403 }
      );
    }

    // دریافت timeline مرتب شده
    const timeline = spec.getStatusTimeline();

    return NextResponse.json({
      success: true,
      timeline,
      spec: {
        _id: spec._id,
        firstName: spec.firstName,
        lastName: spec.lastName,
        personnelCode: spec.personnelCode,
        nationalId: spec.nationalId,
        currentStatus: spec.requestStatus,
        isActive: spec.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-applicant-specs/[id]/timeline:",
      error
    );
    return NextResponse.json(
      { success: false, error: "خطا در دریافت تاریخچه" },
      { status: 500 }
    );
  }
}

