import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import AppealRequest from "@/models/AppealRequest";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import TransferReason from "@/models/TransferReason";
import AcademicYear from "@/models/AcademicYear";
import User from "@/models/User";
import District from "@/models/District";
import Province from "@/models/Province";
import ProfileCorrectionRequest from "@/models/ProfileCorrectionRequest";
import { authService } from "@/lib/auth/authService";

// GET /api/document-review - دریافت درخواست‌های تجدید نظر برای بررسی مستندات
export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - فقط کاربران districtTransferExpert و provinceTransferExpert
    if (
      !["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    let query = {
      selectedReasons: { $exists: true, $ne: [] }, // فقط درخواست‌هایی که دلایل انتخاب شده دارند
    };

    console.log("document-review API - user role:", user.role);
    console.log("document-review API - user district:", user.district);

    // بر اساس نقش کاربر، فیلتر کردن درخواست‌ها
    if (user.role === "districtTransferExpert") {
      // برای کارشناس منطقه: فقط درخواست‌هایی که districtCode برابر کد منطقه کاربر است
      let userDistrictCode;

      if (typeof user.district === "object" && user.district?.code) {
        userDistrictCode = user.district.code;
      } else if (typeof user.district === "string") {
        const district = await District.findById(user.district);
        userDistrictCode = district?.code;
      }

      if (!userDistrictCode) {
        return NextResponse.json(
          { success: false, error: "کد منطقه کاربر یافت نشد" },
          { status: 404 }
        );
      }

      query.districtCode = userDistrictCode;
    } else if (user.role === "provinceTransferExpert") {
      // برای کارشناس استان: درخواست‌هایی که provinceCode برابر کد استان کاربر است
      let userProvinceCode;

      if (typeof user.province === "object" && user.province?.code) {
        userProvinceCode = user.province.code;
      } else if (typeof user.province === "string") {
        const province = await Province.findById(user.province);
        userProvinceCode = province?.code;
      }

      if (!userProvinceCode) {
        return NextResponse.json(
          { success: false, error: "کد استان کاربر یافت نشد" },
          { status: 404 }
        );
      }

      query.provinceCode = userProvinceCode;
    }

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true });
    if (activeAcademicYear) {
      query.academicYear = activeAcademicYear.name;
      console.log(
        `Filtering by active academic year: ${activeAcademicYear.name}`
      );
    } else {
      console.log("No active academic year found");
    }

    // دریافت درخواست‌ها
    const requests = await AppealRequest.find(query)
      .populate({
        path: "selectedReasons.reasonId",
        model: "TransferReason",
        select:
          "title description reasonCode category requiresDocuments requiresAdminApproval requiresDocumentUpload isCulturalCouple hasYearsLimit yearsLimit",
      })
      .populate("chatMessages.senderId", "firstName lastName")
      .sort({ createdAt: -1 })
      .select({
        fullName: 1,
        nationalId: 1,
        personnelCode: 1,
        phone: 1,
        selectedReasons: 1,
        uploadedDocuments: 1,
        userComments: 1,
        userCommentsImages: 1,
        culturalCoupleInfo: 1,
        academicYear: 1,
        overallReviewStatus: 1,
        eligibilityDecision: 1,
        districtCode: 1,
        provinceCode: 1,
        createdAt: 1,
        updatedAt: 1,
        chatMessages: 1,
        chatStatus: 1,
      });

    // دریافت currentRequestStatus از TransferApplicantSpec برای هر درخواست و فیلتر کردن بر اساس منطقه
    const requestsWithStatusAndFiltered = [];

    console.log(
      "document-review API - Total requests before filtering:",
      requests.length
    );

    for (const req of requests) {
      let currentRequestStatus = null;
      let transferApplicantSpec = null;

      // جستجو بر اساس personnelCode
      if (req.personnelCode) {
        transferApplicantSpec = await TransferApplicantSpec.findOne({
          personnelCode: req.personnelCode,
        }).select(
          "currentRequestStatus currentWorkPlaceCode effectiveYears employmentField approvedScore"
        );

        // if (transferApplicantSpec) {
        //   console.log(
        //     "document-review API - currentWorkPlaceCode:",
        //     transferApplicantSpec.currentWorkPlaceCode
        //   );
        // }

        currentRequestStatus =
          transferApplicantSpec?.currentRequestStatus || null;
      }

      // فیلتر کردن بر اساس نقش کاربر
      let shouldInclude = false;

      if (user.role === "districtTransferExpert") {
        // برای کارشناس منطقه: بررسی currentWorkPlaceCode
        let userDistrictCode;
        if (typeof user.district === "object" && user.district?.code) {
          userDistrictCode = user.district.code;
        } else if (typeof user.district === "string") {
          const district = await District.findById(user.district);
          userDistrictCode = district?.code;
        }

        if (transferApplicantSpec?.currentWorkPlaceCode === userDistrictCode) {
          shouldInclude = true;
          console.log(
            "document-review API - Request included for district expert"
          );
        } else {
          console.log(
            "document-review API - Request excluded for district expert"
          );
        }
      } else if (user.role === "provinceTransferExpert") {
        // برای کارشناس استان: بررسی provinceCode درخواست
        shouldInclude = true; // قبلاً فیلتر شده
      }

      if (shouldInclude) {
        // دریافت درخواست‌های اصلاح مشخصات برای این کاربر
        let profileCorrectionRequests = [];
        if (req.personnelCode) {
          profileCorrectionRequests = await ProfileCorrectionRequest.find({
            personnelCode: req.personnelCode,
          })
            .populate("respondedBy", "firstName lastName")
            .sort({ createdAt: -1 })
            .limit(10); // محدود کردن به 10 درخواست اخیر
        }

        requestsWithStatusAndFiltered.push({
          ...req.toObject(),
          _id: req._id.toString(),
          uploadedDocuments: Object.fromEntries(
            req.uploadedDocuments || new Map()
          ),
          currentRequestStatus, // اضافه کردن وضعیت فعلی
          effectiveYears: transferApplicantSpec?.effectiveYears || null, // اضافه کردن سنوات
          approvedScore: transferApplicantSpec?.approvedScore || null, // اضافه کردن امتیاز
          employmentField: transferApplicantSpec?.employmentField || null, // اضافه کردن رشته شغلی
          profileCorrectionRequests: profileCorrectionRequests, // اضافه کردن درخواست‌های اصلاح مشخصات
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      requests: requestsWithStatusAndFiltered,
      userRole: user.role,
    });
  } catch (error) {
    console.error("Error in GET /api/document-review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت درخواست‌های بررسی مستندات",
      },
      { status: 500 }
    );
  }
}

// PUT /api/document-review - به‌روزرسانی بررسی دلایل
export async function PUT(request) {
  try {
    const user = await authService.validateToken(request);

    if (!user || !user.userId) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      !["districtTransferExpert", "provinceTransferExpert"].includes(user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { requestId, reviewData } = body;

    // اعتبارسنجی ورودی‌ها
    if (!requestId || !reviewData) {
      return NextResponse.json(
        { success: false, error: "شناسه درخواست و داده‌های بررسی الزامی است" },
        { status: 400 }
      );
    }

    // یافتن درخواست با populate
    const appealRequest = await AppealRequest.findById(requestId).populate({
      path: "selectedReasons.reasonId",
      model: "TransferReason",
    });

    if (!appealRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی به این درخواست خاص
    let hasAccess = false;

    if (user.role === "districtTransferExpert") {
      let userDistrictCode;
      if (typeof user.district === "object" && user.district?.code) {
        userDistrictCode = user.district.code;
      } else if (typeof user.district === "string") {
        const district = await District.findById(user.district);
        userDistrictCode = district?.code;
      }
      hasAccess = appealRequest.districtCode === userDistrictCode;
    } else if (user.role === "provinceTransferExpert") {
      let userProvinceCode;
      if (typeof user.province === "object" && user.province?.code) {
        userProvinceCode = user.province.code;
      } else if (typeof user.province === "string") {
        const province = await Province.findById(user.province);
        userProvinceCode = province?.code;
      }
      hasAccess = appealRequest.provinceCode === userProvinceCode;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی به این درخواست" },
        { status: 403 }
      );
    }

    // دریافت کدهای مکانی کارشناس
    let reviewerLocationCode = null;
    if (user.role === "districtTransferExpert") {
      if (typeof user.district === "object" && user.district?.code) {
        reviewerLocationCode = user.district.code;
      } else if (typeof user.district === "string") {
        const district = await District.findById(user.district);
        reviewerLocationCode = district?.code;
      }
    } else if (user.role === "provinceTransferExpert") {
      if (typeof user.province === "object" && user.province?.code) {
        reviewerLocationCode = user.province.code;
      } else if (typeof user.province === "string") {
        const province = await Province.findById(user.province);
        reviewerLocationCode = province?.code;
      }
    }

    // به‌روزرسانی اطلاعات بررسی برای هر دلیل
    const currentTime = new Date();
    let hasReviews = false;

    appealRequest.selectedReasons.forEach((reason) => {
      const reasonKey = reason._id.toString();
      const reviewStatus = reviewData[reasonKey]; // "approved", "rejected", یا undefined
      const expertComment = reviewData[`${reasonKey}_comment`] || "";

      // اگر وضعیت بررسی موجود باشد یا توضیحات وجود داشته باشد
      if (reviewStatus || expertComment.trim()) {
        // به‌روزرسانی اطلاعات بررسی
        reason.review = {
          status: reviewStatus || reason.review?.status || "pending",
          reviewedBy: user.userId,
          reviewedAt: currentTime,
          expertComment: expertComment,
          reviewerRole: user.role,
          reviewerLocationCode: reviewerLocationCode,
          metadata: {
            reviewType: "individual_reason_review",
            originalReviewData: reviewData,
          },
        };

        hasReviews = true;
      }
    });

    // به‌روزرسانی وضعیت کلی
    if (hasReviews) {
      appealRequest.overallReviewStatus = "in_review";
      appealRequest.reviewedBy = user.userId;
      appealRequest.reviewedAt = currentTime;
    }

    await appealRequest.save();

    // بازیابی مجدد با populate برای اطمینان از داده‌های به‌روز
    const refreshedAppealRequest = await AppealRequest.findById(
      appealRequest._id
    ).populate({
      path: "selectedReasons.reasonId",
      model: "TransferReason",
    });

    // منطق تصمیم‌گیری خودکار مشمولیت
    let autoDecisionResult = null;
    if (hasReviews && refreshedAppealRequest.personnelCode) {
      const transferApplicantSpec = await TransferApplicantSpec.findOne({
        personnelCode: refreshedAppealRequest.personnelCode,
      });

      if (transferApplicantSpec) {
        const previousStatus = transferApplicantSpec.currentRequestStatus;

        // بررسی وضعیت بندهای نیازمند تایید کارشناس
        const reasonsRequiringApproval =
          refreshedAppealRequest.selectedReasons.filter((reason) => {
            return reason.reasonId?.requiresAdminApproval === true;
          });

        // محاسبه آمار بررسی‌ها
        const reviewedReasons = reasonsRequiringApproval.filter((reason) => {
          return reason.review?.status && reason.review.status !== "pending";
        });
        const pendingReasons = reasonsRequiringApproval.filter(
          (reason) =>
            !reason.review?.status || reason.review.status === "pending"
        );
        const approvedReasons = reviewedReasons.filter(
          (reason) => reason.review?.status === "approved"
        );
        const rejectedReasons = reviewedReasons.filter(
          (reason) => reason.review?.status === "rejected"
        );

        let newStatus = null;
        let statusReason = "";
        let autoDecisionMade = false;

        // تصمیم‌گیری بر اساس وضعیت بندها
        if (pendingReasons.length > 0) {
          // هنوز بندهایی pending هستند - وضعیت در حال بررسی
          newStatus = "source_review";
          statusReason = `در حال بررسی مستندات - ${pendingReasons.length} بند در انتظار بررسی`;
        } else if (
          reasonsRequiringApproval.length > 0 &&
          reviewedReasons.length === reasonsRequiringApproval.length
        ) {
          // همه بندها بررسی شده‌اند
          if (approvedReasons.length > 0) {
            // حداقل یک بند تایید شده - تایید مشمولیت
            newStatus = "exception_eligibility_approval";
            statusReason = `تایید مشمولیت استثنا - ${approvedReasons.length} بند تایید شده از ${reasonsRequiringApproval.length} بند`;
            autoDecisionMade = true;
          } else if (
            rejectedReasons.length === reasonsRequiringApproval.length
          ) {
            // همه بندها رد شده - رد مشمولیت
            newStatus = "exception_eligibility_rejection";
            statusReason = `رد مشمولیت استثنا - همه ${rejectedReasons.length} بند رد شده`;
            autoDecisionMade = true;
          }
        }

        // اگر وضعیت جدید تعیین شده و متفاوت از وضعیت فعلی است
        if (newStatus && previousStatus !== newStatus) {
          transferApplicantSpec.currentRequestStatus = newStatus;

          // اضافه کردن به workflow
          transferApplicantSpec.requestStatusWorkflow.push({
            status: newStatus,
            changedBy: user.userId,
            changedAt: new Date(),
            previousStatus: previousStatus,
            reason: statusReason,
            metadata: {
              reviewType: autoDecisionMade
                ? "auto_eligibility_decision"
                : "document_review_start",
              reviewerRole: user.role,
              reviewerLocationCode: reviewerLocationCode,
              appealRequestId: refreshedAppealRequest._id.toString(),
              reasonsRequiringApproval: reasonsRequiringApproval.length,
              reviewedReasonsCount: reviewedReasons.length,
              approvedReasonsCount: approvedReasons.length,
              rejectedReasonsCount: rejectedReasons.length,
              pendingReasonsCount: pendingReasons.length,
              autoDecisionMade: autoDecisionMade,
              totalCommentsCount: Object.keys(reviewData).filter(
                (key) => key.includes("_comment") && reviewData[key].trim()
              ).length,
            },
          });

          // اضافه کردن به statusLog
          if (!transferApplicantSpec.statusLog) {
            transferApplicantSpec.statusLog = [];
          }

          transferApplicantSpec.statusLog.push({
            fromStatus: previousStatus,
            toStatus: newStatus,
            actionType: "status_change",
            performedBy: new mongoose.Types.ObjectId(user.userId),
            performedAt: new Date(),
            comment: statusReason,
            metadata: {
              reviewType: autoDecisionMade
                ? "auto_eligibility_decision"
                : "document_review_start",
              reviewerRole: user.role,
              appealRequestId: refreshedAppealRequest._id.toString(),
              locationCode: reviewerLocationCode,
              autoDecisionMade: autoDecisionMade,
            },
          });

          await transferApplicantSpec.save();

          // تنظیم نتیجه تصمیم‌گیری خودکار
          autoDecisionResult = {
            made: autoDecisionMade,
            previousStatus: previousStatus,
            newStatus: newStatus,
            statusReason: statusReason,
            reasonsRequiringApproval: reasonsRequiringApproval.length,
            reviewedReasonsCount: reviewedReasons.length,
            approvedReasonsCount: approvedReasons.length,
            rejectedReasonsCount: rejectedReasons.length,
            pendingReasonsCount: pendingReasons.length,
          };

          console.log(
            `Auto eligibility decision for personnel: ${refreshedAppealRequest.personnelCode} - Status: ${newStatus}, Decision Made: ${autoDecisionMade}`
          );
        }
      }
    }

    // استفاده از درخواست refresh شده و populate اضافی
    const updatedRequest = await AppealRequest.findById(
      refreshedAppealRequest._id
    )
      .populate({
        path: "selectedReasons.reasonId",
        model: "TransferReason",
      })
      .populate("userId", "fullName nationalId phone phoneVerified")
      .populate("districtCode", "name code")
      .lean();

    // دریافت currentRequestStatus از TransferApplicantSpec
    let currentRequestStatus = null;
    let effectiveYears = null;
    if (updatedRequest.personnelCode) {
      const transferApplicantSpec = await TransferApplicantSpec.findOne({
        personnelCode: updatedRequest.personnelCode,
      }).select("currentRequestStatus effectiveYears");

      currentRequestStatus =
        transferApplicantSpec?.currentRequestStatus || null;
      effectiveYears = transferApplicantSpec?.effectiveYears || null;
    }

    // اضافه کردن فیلدهای اضافی
    let uploadedDocuments = {};
    try {
      if (updatedRequest.uploadedDocuments) {
        if (updatedRequest.uploadedDocuments instanceof Map) {
          uploadedDocuments = Object.fromEntries(
            updatedRequest.uploadedDocuments
          );
        } else if (typeof updatedRequest.uploadedDocuments === "object") {
          uploadedDocuments = updatedRequest.uploadedDocuments;
        }
      }
    } catch (error) {
      console.error("Error processing uploadedDocuments:", error);
      uploadedDocuments = {};
    }

    const finalUpdatedRequest = {
      ...updatedRequest,
      currentRequestStatus,
      effectiveYears,
      uploadedDocuments,
      createdAt: updatedRequest.createdAt?.toISOString(),
      updatedAt: updatedRequest.updatedAt?.toISOString(),
    };

    // تعیین پیام مناسب بر اساس تصمیم‌گیری خودکار
    let responseMessage = "بررسی با موفقیت ذخیره شد";
    if (autoDecisionResult?.made) {
      if (autoDecisionResult.newStatus === "exception_eligibility_approval") {
        responseMessage = `✅ تایید مشمولیت استثنا - ${autoDecisionResult.approvedReasonsCount} بند تایید شده`;
      } else if (
        autoDecisionResult.newStatus === "exception_eligibility_rejection"
      ) {
        responseMessage = `❌ رد مشمولیت استثنا - همه ${autoDecisionResult.rejectedReasonsCount} بند رد شده`;
      }
    } else if (autoDecisionResult?.pendingReasonsCount > 0) {
      responseMessage = `بررسی ذخیره شد - ${autoDecisionResult.pendingReasonsCount} بند در انتظار تکمیل بررسی`;
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        id: refreshedAppealRequest._id.toString(),
        overallReviewStatus: refreshedAppealRequest.overallReviewStatus,
        selectedReasons: refreshedAppealRequest.selectedReasons,
        autoDecision: autoDecisionResult,
      },
      updatedRequest: finalUpdatedRequest,
    });
  } catch (error) {
    console.error("Error in PUT /api/document-review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ذخیره بررسی",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// POST endpoint removed - eligibility decisions are now handled automatically in PUT endpoint
