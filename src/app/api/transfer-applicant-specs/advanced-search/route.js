import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import AppealRequest from "@/models/AppealRequest";
import TransferReason from "@/models/TransferReason";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import EmploymentField from "@/models/EmploymentField";
import District from "@/models/District";
import Province from "@/models/Province";
import User from "@/models/User";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// GET /api/transfer-applicant-specs/advanced-search - جستجوی پیشرفته برای کارشناسان استان
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط provinceTransferExpert
    if (
      userAuth.role !== ROLES.PROVINCE_TRANSFER_EXPERT &&
      userAuth.role !== ROLES.SYSTEM_ADMIN &&
      userAuth.role !== ROLES.DISTRICT_TRANSFER_EXPERT
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی - فقط کارشناسان استان" },
        { status: 403 }
      );
    }

    await connectDB();

    // Ensure all models are registered
    if (!mongoose.models.TransferReason) {
      console.log("TransferReason model not found, attempting to register...");
      // The import should handle this, but this is a safety check
    }

    const { searchParams } = new URL(request.url);
    const nationalId = searchParams.get("nationalId") || "";
    const personnelCode = searchParams.get("personnelCode") || "";
    const finalTransferDestinationCode =
      searchParams.get("finalTransferDestinationCode") || "";
    const finalResultReason = searchParams.get("finalResultReason") || "";
    const approvedClauses = searchParams.get("approvedClauses") || "";

    // اعتبارسنجی ورودی
    if (
      !nationalId &&
      !personnelCode &&
      !finalTransferDestinationCode &&
      !finalResultReason &&
      !approvedClauses
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "حداقل یکی از فیلدهای جستجو باید وارد شود",
        },
        { status: 400 }
      );
    }

    // ساخت query برای جستجو
    let searchQuery = {};

    // جستجو براساس فیلدهای اصلی
    if (personnelCode) {
      searchQuery.personnelCode = personnelCode.trim();
    } else if (nationalId) {
      searchQuery.nationalId = nationalId.trim();
    }

    // جستجو براساس فیلدهای نتیجه نهایی
    if (finalTransferDestinationCode) {
      console.log("=== Advanced Search API Debug ===");
      console.log(
        "Searching for finalTransferDestinationCode:",
        finalTransferDestinationCode.trim()
      );
      searchQuery.finalTransferDestinationCode =
        finalTransferDestinationCode.trim();
    }

    if (finalResultReason) {
      searchQuery.finalResultReason = {
        $regex: finalResultReason.trim(),
        $options: "i",
      };
    }

    if (approvedClauses) {
      searchQuery.approvedClauses = {
        $regex: approvedClauses.trim(),
        $options: "i",
      };
    }

    console.log("Final search query:", JSON.stringify(searchQuery, null, 2));

    // دریافت اطلاعات پایه از TransferApplicantSpec
    console.log("Executing MongoDB query...");

    // اگر فقط finalTransferDestinationCode جستجو می‌شود، همه رکوردها را برگردان
    if (
      finalTransferDestinationCode &&
      !nationalId &&
      !personnelCode &&
      !finalResultReason &&
      !approvedClauses
    ) {
      console.log(
        "Searching for multiple records with finalTransferDestinationCode"
      );
      const transferSpecs = await TransferApplicantSpec.find(searchQuery)
        .populate("createdBy", "firstName lastName fullName")
        .populate("currentWorkPlaceCode", "name province")
        .populate({
          path: "currentWorkPlaceCode",
          populate: {
            path: "province",
            model: "Province",
            select: "name",
          },
        })
        .lean();

      console.log(
        "MongoDB query result: Found",
        transferSpecs.length,
        "records"
      );

      if (transferSpecs.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "هیچ پرسنلی با کد منطقه مقصد مشخص شده یافت نشد",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transferSpecs,
        total: transferSpecs.length,
      });
    }

    // برای سایر جستجوها، فقط یک رکورد برگردان
    const transferSpec = await TransferApplicantSpec.findOne(searchQuery)
      .populate("createdBy", "firstName lastName fullName")
      .populate("currentWorkPlaceCode", "name province")
      .populate({
        path: "currentWorkPlaceCode",
        populate: {
          path: "province",
          model: "Province",
          select: "name",
        },
      })
      .lean();

    console.log(
      "MongoDB query result:",
      transferSpec ? "Found 1 record" : "No records found"
    );
    if (transferSpec) {
      console.log("Found record nationalId:", transferSpec.nationalId);
      console.log(
        "Found record finalTransferDestinationCode:",
        transferSpec.finalTransferDestinationCode
      );
    }

    if (!transferSpec) {
      return NextResponse.json(
        { success: false, error: "پرسنل با مشخصات وارد شده یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی استانی
    let userProvinceCode;
    if (typeof userAuth.province === "object" && userAuth.province?.code) {
      userProvinceCode = userAuth.province.code;
    } else if (typeof userAuth.province === "string") {
      const province = await Province.findById(userAuth.province);
      userProvinceCode = province?.code;
    }

    // دریافت اطلاعات منطقه برای بررسی استان
    const currentDistrict = await District.findOne({
      code: transferSpec.currentWorkPlaceCode,
    })
      .populate("province", "code name")
      .lean();

    if (
      !currentDistrict ||
      currentDistrict.province?.code !== userProvinceCode
    ) {
      return NextResponse.json(
        { success: false, error: "این پرسنل در حوزه استانی شما قرار ندارد" },
        { status: 403 }
      );
    }

    // دریافت درخواست‌های تجدید نظر
    const appealRequests = await AppealRequest.find({
      $or: [
        { personnelCode: transferSpec.personnelCode },
        { nationalId: transferSpec.nationalId },
      ],
    })
      .populate({
        path: "selectedReasons.reasonId",
        model: TransferReason,
        select:
          "title description reasonCode category requiresDocuments requiresAdminApproval requiresDocumentUpload isCulturalCouple hasYearsLimit yearsLimit",
      })
      .populate("chatMessages.senderId", "firstName lastName")
      .populate("reviewedBy", "firstName lastName")
      .populate("userId", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    // دریافت درخواست‌های اصلاح مشخصات
    let profileCorrectionRequests = [];
    try {
      profileCorrectionRequests = await ProfileCorrectionRequest.find({
        $or: [
          { personnelCode: transferSpec.personnelCode },
          { nationalId: transferSpec.nationalId },
        ],
      })
        .populate("respondedBy", "firstName lastName")
        .populate("userId", "firstName lastName fullName")
        .sort({ createdAt: -1 })
        .lean();
    } catch (populateError) {
      console.log(
        "ProfileCorrectionRequest populate error:",
        populateError.message
      );
      // Fallback: get without populate
      profileCorrectionRequests = await ProfileCorrectionRequest.find({
        $or: [
          { personnelCode: transferSpec.personnelCode },
          { nationalId: transferSpec.nationalId },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    // محاسبه رتبه برحسب رشته و جنسیت
    const employmentField = await EmploymentField.findOne({
      fieldCode: transferSpec.fieldCode,
      isActive: true,
    }).lean();

    let rankingInfo = null;
    if (
      employmentField &&
      transferSpec.approvedScore !== null &&
      transferSpec.approvedScore !== undefined
    ) {
      const isShared = employmentField.isShared || false;

      // دریافت پارامترهای وضعیت از query string
      const selectedStatuses = searchParams.get("statuses")?.split(",") || [
        "user_approval",
        "source_review",
        "exception_eligibility_approval",
        "source_approval",
        "source_rejection",
        "exception_eligibility_rejection",
        "province_review",
        "province_approval",
        "province_rejection",
        "destination_review",
        "destination_approval",
        "destination_rejection",
      ];

      // تعیین query برای محاسبه رتبه
      const rankQuery = {
        fieldCode: transferSpec.fieldCode,
        currentWorkPlaceCode: transferSpec.currentWorkPlaceCode,
        currentRequestStatus: {
          $in: selectedStatuses,
        },
        approvedScore: { $exists: true, $ne: null },
      };

      // اگر رشته مشترک نیست، جنسیت را در نظر بگیر
      if (!isShared && transferSpec.gender) {
        rankQuery.gender = transferSpec.gender;
      }

      // تعداد کل افراد واجد شرایط
      const totalEligible = await TransferApplicantSpec.countDocuments(
        rankQuery
      );

      // تعداد افراد با امتیاز بهتر
      const betterScoreQuery = {
        ...rankQuery,
        approvedScore: { $gt: transferSpec.approvedScore },
      };
      const betterScoreCount = await TransferApplicantSpec.countDocuments(
        betterScoreQuery
      );

      // محاسبه رتبه برای هر وضعیت جداگانه
      const statusBreakdown = {};
      for (const status of selectedStatuses) {
        const statusQuery = {
          ...rankQuery,
          currentRequestStatus: status,
        };

        const statusTotal = await TransferApplicantSpec.countDocuments(
          statusQuery
        );
        const statusBetterScore = await TransferApplicantSpec.countDocuments({
          ...statusQuery,
          approvedScore: { $gt: transferSpec.approvedScore },
        });

        statusBreakdown[status] = {
          total: statusTotal,
          rank: statusBetterScore + 1,
          isCurrentUserStatus: transferSpec.currentRequestStatus === status,
        };
      }

      rankingInfo = {
        rank: betterScoreCount + 1,
        totalEligible: totalEligible,
        fieldTitle: employmentField.title,
        fieldCode: employmentField.fieldCode,
        isShared: isShared,
        gender: transferSpec.gender,
        approvedScore: transferSpec.approvedScore,
        districtCode: transferSpec.currentWorkPlaceCode,
        districtName: currentDistrict.name,
        selectedStatuses: selectedStatuses,
        statusBreakdown: statusBreakdown,
      };
    }

    // تبدیل statusLog و requestStatusWorkflow به فرمت نمایشی
    const processedStatusLog =
      transferSpec.statusLog?.map((log) => ({
        ...log,
        _id: log._id?.toString(),
        performedBy: log.performedBy?.toString(),
      })) || [];

    const processedWorkflow =
      transferSpec.requestStatusWorkflow?.map((workflow) => ({
        ...workflow,
        changedBy: workflow.changedBy?.toString(),
      })) || [];

    // ترکیب و مرتب‌سازی تمام تغییرات وضعیت
    const allStatusChanges = [
      ...processedStatusLog.map((log) => ({
        type: "statusLog",
        date: log.performedAt,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actionType: log.actionType,
        performedBy: log.performedBy,
        comment: log.comment,
        metadata: log.metadata,
      })),
      ...processedWorkflow.map((workflow) => ({
        type: "workflow",
        date: workflow.changedAt,
        fromStatus: workflow.previousStatus,
        toStatus: workflow.status,
        actionType: "status_change",
        performedBy: workflow.changedBy,
        comment: workflow.reason,
        metadata: workflow.metadata,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // آماده‌سازی پاسخ نهایی
    const responseData = {
      // اطلاعات اصلی TransferApplicantSpec
      transferSpec: {
        ...transferSpec,
        _id: transferSpec._id.toString(),
        createdBy: transferSpec.createdBy
          ? {
              ...transferSpec.createdBy,
              _id: transferSpec.createdBy._id?.toString(),
            }
          : null,
        createdAt: transferSpec.createdAt,
        updatedAt: transferSpec.updatedAt,
        districtInfo: {
          code: currentDistrict.code,
          name: currentDistrict.name,
          province: currentDistrict.province,
        },
        currentRequestStatus: transferSpec.currentRequestStatus,
        employmentField: transferSpec.employmentField || null,
        currentWorkPlaceCode: transferSpec.currentWorkPlaceCode
          ? {
              ...transferSpec.currentWorkPlaceCode,
              _id: transferSpec.currentWorkPlaceCode._id?.toString(),
              province: transferSpec.currentWorkPlaceCode.province
                ? {
                    ...transferSpec.currentWorkPlaceCode.province,
                    _id: transferSpec.currentWorkPlaceCode.province._id?.toString(),
                  }
                : null,
            }
          : null,
      },

      // درخواست‌های تجدید نظر
      appealRequests: appealRequests.map((req) => ({
        ...req,
        _id: req._id.toString(),
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        userId: req.userId
          ? {
              ...req.userId,
              _id: req.userId._id?.toString(),
              createdAt: req.userId.createdAt,
            }
          : null,
        reviewedBy: req.reviewedBy
          ? {
              ...req.reviewedBy,
              _id: req.reviewedBy._id?.toString(),
            }
          : null,
        uploadedDocuments: (() => {
          try {
            if (req.uploadedDocuments instanceof Map) {
              return Object.fromEntries(req.uploadedDocuments);
            } else if (
              req.uploadedDocuments &&
              typeof req.uploadedDocuments === "object"
            ) {
              return req.uploadedDocuments;
            } else {
              return {};
            }
          } catch (error) {
            console.log("Error processing uploadedDocuments:", error);
            return {};
          }
        })(),
        // جزئیات کامل دلایل انتخاب شده با نظرات کارشناس
        selectedReasons:
          req.selectedReasons?.map((reason) => ({
            _id: reason._id?.toString(),
            reasonId: reason.reasonId
              ? {
                  ...reason.reasonId,
                  _id: reason.reasonId._id?.toString(),
                }
              : null,
            reasonCode: reason.reasonCode,
            reasonTitle: reason.reasonTitle,
            title: reason.title,
            // جزئیات بررسی کارشناس منطقه
            review: reason.review
              ? {
                  status: reason.review.status, // pending, approved, rejected
                  reviewedBy: reason.review.reviewedBy?.toString(),
                  reviewedAt: reason.review.reviewedAt,
                  expertComment: reason.review.expertComment || "", // نظر کارشناس منطقه
                  reviewerRole: reason.review.reviewerRole, // districtTransferExpert, provinceTransferExpert
                  reviewerLocationCode: reason.review.reviewerLocationCode,
                  metadata: reason.review.metadata || {},
                }
              : {
                  status: "pending",
                  reviewedBy: null,
                  reviewedAt: null,
                  expertComment: "",
                  reviewerRole: null,
                  reviewerLocationCode: null,
                  metadata: {},
                },
          })) || [],
      })),

      // درخواست‌های اصلاح مشخصات
      profileCorrectionRequests: profileCorrectionRequests.map((req) => ({
        ...req,
        _id: req._id.toString(),
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        requestedBy: req.userId
          ? {
              ...req.userId,
              _id: req.userId._id?.toString(),
              createdAt: req.userId.createdAt,
            }
          : {
              fullName: req.fullName || "کاربر نامشخص",
              _id: req.userId?.toString() || null,
            },
        respondedBy: req.respondedBy
          ? {
              ...req.respondedBy,
              _id: req.respondedBy._id?.toString(),
            }
          : null,
        requestType: req.disputedField || "نامشخص",
        responseDate: req.respondedAt || null,
      })),

      // اطلاعات رتبه‌بندی
      rankingInfo,

      // تاریخچه کامل تغییرات وضعیت
      statusHistory: {
        allChanges: allStatusChanges,
        statusLog: processedStatusLog,
        workflow: processedWorkflow,
      },

      // آمار کلی
      summary: {
        totalAppealRequests: appealRequests.length,
        totalProfileCorrections: profileCorrectionRequests.length,
        totalStatusChanges: allStatusChanges.length,
        currentStatus: transferSpec.currentRequestStatus,
        lastStatusChange: allStatusChanges[0]?.date || transferSpec.updatedAt,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error in advanced search:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در انجام جستجوی پیشرفته",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
