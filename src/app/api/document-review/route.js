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

      console.log(
        "document-review API - Processing request:",
        req._id,
        "personnelCode:",
        req.personnelCode
      );

      // جستجو بر اساس personnelCode
      if (req.personnelCode) {
        transferApplicantSpec = await TransferApplicantSpec.findOne({
          personnelCode: req.personnelCode,
        }).select("currentRequestStatus currentWorkPlaceCode effectiveYears");

        console.log(
          "document-review API - TransferSpec found:",
          !!transferApplicantSpec
        );
        if (transferApplicantSpec) {
          console.log(
            "document-review API - currentWorkPlaceCode:",
            transferApplicantSpec.currentWorkPlaceCode
          );
        }

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

        console.log(
          "document-review API - Comparing:",
          transferApplicantSpec?.currentWorkPlaceCode,
          "vs",
          userDistrictCode
        );

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
        console.log(
          "document-review API - Request included for province expert"
        );
      }

      if (shouldInclude) {
        requestsWithStatusAndFiltered.push({
          ...req.toObject(),
          _id: req._id.toString(),
          uploadedDocuments: Object.fromEntries(
            req.uploadedDocuments || new Map()
          ),
          currentRequestStatus, // اضافه کردن وضعیت فعلی
          effectiveYears: transferApplicantSpec?.effectiveYears || null, // اضافه کردن سنوات
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
        });
      }
    }

    console.log(
      "document-review API - Total requests after filtering:",
      requestsWithStatusAndFiltered.length
    );

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

    // یافتن درخواست
    const appealRequest = await AppealRequest.findById(requestId);

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

    // تغییر وضعیت کاربر در TransferApplicantSpec به source_review
    if (hasReviews && appealRequest.personnelCode) {
      const transferApplicantSpec = await TransferApplicantSpec.findOne({
        personnelCode: appealRequest.personnelCode,
      });

      if (transferApplicantSpec) {
        const previousStatus = transferApplicantSpec.currentRequestStatus;

        // فقط اگر وضعیت فعلی source_review نباشد، تغییر دهیم
        if (previousStatus !== "source_review") {
          // به‌روزرسانی وضعیت به source_review
          transferApplicantSpec.currentRequestStatus = "source_review";

          // اضافه کردن به workflow
          transferApplicantSpec.requestStatusWorkflow.push({
            status: "source_review",
            changedBy: user.userId,
            changedAt: new Date(),
            previousStatus: previousStatus,
            reason: "شروع بررسی مستندات توسط کارشناس",
            metadata: {
              reviewType: "document_review_start",
              reviewerRole: user.role,
              reviewerLocationCode: reviewerLocationCode,
              appealRequestId: appealRequest._id.toString(),
              reviewedReasonsCount: Object.keys(reviewData).filter(
                (key) =>
                  !key.includes("_comment") &&
                  (reviewData[key] === "approved" ||
                    reviewData[key] === "rejected")
              ).length,
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
            toStatus: "source_review",
            actionType: "status_change",
            performedBy: new mongoose.Types.ObjectId(user.userId),
            performedAt: new Date(),
            comment: `شروع بررسی مستندات توسط ${
              user.role === "districtTransferExpert"
                ? "کارشناس منطقه"
                : "کارشناس استان"
            }`,
            metadata: {
              reviewType: "document_review_start",
              reviewerRole: user.role,
              appealRequestId: appealRequest._id.toString(),
              locationCode: reviewerLocationCode,
            },
          });

          await transferApplicantSpec.save();
          const reviewedCount = Object.keys(reviewData).filter(
            (key) =>
              !key.includes("_comment") &&
              (reviewData[key] === "approved" || reviewData[key] === "rejected")
          ).length;
          const commentsCount = Object.keys(reviewData).filter(
            (key) => key.includes("_comment") && reviewData[key].trim()
          ).length;

          console.log(
            `Status changed to source_review for personnel: ${appealRequest.personnelCode} by ${user.role}. Reviewed reasons: ${reviewedCount}, Comments: ${commentsCount}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "بررسی با موفقیت ذخیره شد",
      data: {
        id: appealRequest._id.toString(),
        overallReviewStatus: appealRequest.overallReviewStatus,
        selectedReasons: appealRequest.selectedReasons,
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/document-review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در ذخیره بررسی",
      },
      { status: 500 }
    );
  }
}

// POST /api/document-review - تایید/رد نهایی مشمولیت استثنا
export async function POST(request) {
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
    const { requestId, action, comment } = body; // action: 'approve' یا 'reject'

    // اعتبارسنجی ورودی‌ها
    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "شناسه درخواست و عمل (تایید/رد) الزامی است" },
        { status: 400 }
      );
    }

    // یافتن درخواست
    const appealRequest = await AppealRequest.findById(requestId).populate({
      path: "selectedReasons.reasonId",
      model: "TransferReason",
      select: "requiresAdminApproval title",
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

    // تعیین وضعیت جدید در TransferApplicantSpec
    const newStatus =
      action === "approve"
        ? "exception_eligibility_approval"
        : "exception_eligibility_rejection";

    // به‌روزرسانی تصمیم نهایی در AppealRequest
    appealRequest.eligibilityDecision = {
      decision: action === "approve" ? "approved" : "rejected",
      decidedBy: user.userId,
      decidedAt: new Date(),
      comment: comment || "",
      deciderRole: user.role,
    };

    appealRequest.overallReviewStatus = "completed";

    await appealRequest.save();

    // تغییر وضعیت کاربر در TransferApplicantSpec
    if (appealRequest.personnelCode) {
      const transferApplicantSpec = await TransferApplicantSpec.findOne({
        personnelCode: appealRequest.personnelCode,
      });

      if (transferApplicantSpec) {
        const previousStatus = transferApplicantSpec.currentRequestStatus;

        // به‌روزرسانی وضعیت
        transferApplicantSpec.currentRequestStatus = newStatus;

        // اضافه کردن به workflow
        transferApplicantSpec.requestStatusWorkflow.push({
          status: newStatus,
          changedBy: user.userId,
          changedAt: new Date(),
          previousStatus: previousStatus,
          reason:
            action === "approve" ? "تایید مشمولیت استثنا" : "رد مشمولیت استثنا",
          metadata: {
            reviewType: "final_eligibility_review",
            reviewerRole: user.role,
            action: action,
            comment: comment || "",
            finalDecision: true,
            appealRequestId: requestId,
          },
        });

        // اضافه کردن به statusLog
        if (!transferApplicantSpec.statusLog) {
          transferApplicantSpec.statusLog = [];
        }

        transferApplicantSpec.statusLog.push({
          fromStatus: previousStatus,
          toStatus: newStatus,
          actionType: action === "approve" ? "approval" : "rejection",
          performedBy: new mongoose.Types.ObjectId(user.userId),
          performedAt: new Date(),
          comment: `${
            action === "approve" ? "تایید" : "رد"
          } مشمولیت استثنا توسط ${
            user.role === "districtTransferExpert"
              ? "کارشناس منطقه"
              : "کارشناس استان"
          }`,
          metadata: {
            reviewType: "final_eligibility_review",
            appealRequestId: requestId,
            decision: action,
            userComment: comment || "",
            finalDecision: true,
          },
        });

        await transferApplicantSpec.save();
        console.log(
          `Status changed to ${newStatus} for personnel: ${appealRequest.personnelCode} - Decision: ${action}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "مشمولیت استثنا تایید شد"
          : "مشمولیت استثنا رد شد",
      data: {
        id: appealRequest._id.toString(),
        eligibilityDecision: appealRequest.eligibilityDecision,
        newStatus: newStatus,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/document-review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در تایید/رد مشمولیت",
      },
      { status: 500 }
    );
  }
}
