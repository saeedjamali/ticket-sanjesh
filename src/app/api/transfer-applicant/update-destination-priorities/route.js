import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import { authService } from "@/lib/auth/authService";

export async function PUT(request) {
  try {
    // احراز هویت کاربر
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی نقش کاربر
    if (userAuth.role !== "transferApplicant") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    // دریافت داده‌های درخواست
    const { destinationPriorities, transferTypes } = await request.json();

    if (!destinationPriorities || !Array.isArray(destinationPriorities)) {
      return NextResponse.json(
        { success: false, error: "داده‌های نامعتبر" },
        { status: 400 }
      );
    }

    // یافتن مشخصات کاربر
    const userSpecs = await TransferApplicantSpec.findOne({
      nationalId: userAuth.nationalId,
    });

    if (!userSpecs) {
      return NextResponse.json(
        { success: false, error: "مشخصات کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // آماده‌سازی داده‌های به‌روزرسانی
    const updateData = {};

    // تبدیل نوع انتقال از فارسی به انگلیسی
    const convertTransferType = (persianType) => {
      switch (persianType) {
        case "دائم یا موقت با اولویت دائم":
          return "permanent_preferred";
        case "فقط دائم":
          return "permanent_only";
        case "فقط موقت":
          return "temporary_only";
        default:
          return "permanent_preferred";
      }
    };

    // تبدیل نوع انتقال از انگلیسی به فارسی
    const getTransferTypeText = (englishType) => {
      switch (englishType) {
        case "permanent_preferred":
          return "دائم یا موقت با اولویت دائم";
        case "permanent_only":
          return "فقط دائم";
        case "temporary_only":
          return "فقط موقت";
        default:
          return "دائم یا موقت با اولویت دائم";
      }
    };

    // به‌روزرسانی اولویت‌های مقصد و نوع انتقال
    destinationPriorities.forEach((item) => {
      const { priority, destinationCode, transferType } = item;

      if (priority >= 1 && priority <= 7) {
        // بررسی اینکه آیا کاربر مجاز به تغییر مقصد است یا نه
        if (userSpecs.canEditDestination) {
          if (destinationCode && destinationCode.trim() !== "") {
            // ایجاد object مطابق با destinationSchema
            updateData[`destinationPriority${priority}`] = {
              districtCode: destinationCode,
              transferType: convertTransferType(transferType),
            };
            // به‌روزرسانی نوع انتقال درخواستی
            updateData[`requestedTransferType${priority}`] =
              convertTransferType(transferType);
          } else {
            // اگر destinationCode خالی است، اولویت را پاک کن
            updateData[`destinationPriority${priority}`] = null;
            updateData[`requestedTransferType${priority}`] = null;
          }
        } else {
          // کاربر مجاز به تغییر مقصد نیست، اما می‌تواند اولویت‌های خالی را اضافه کند
          const currentDestination =
            userSpecs[`destinationPriority${priority}`];

          if (currentDestination && currentDestination.districtCode) {
            // اولویت موجود - فقط نوع انتقال را به‌روزرسانی کن
            if (transferType) {
              updateData[`destinationPriority${priority}`] = {
                districtCode: currentDestination.districtCode,
                transferType: convertTransferType(transferType),
              };
              // به‌روزرسانی نوع انتقال درخواستی
              updateData[`requestedTransferType${priority}`] =
                convertTransferType(transferType);
            }
          } else if (destinationCode && destinationCode.trim() !== "") {
            // اولویت خالی - کاربر می‌تواند مقصد جدید اضافه کند
            updateData[`destinationPriority${priority}`] = {
              districtCode: destinationCode,
              transferType: convertTransferType(transferType),
            };
            // به‌روزرسانی نوع انتقال درخواستی
            updateData[`requestedTransferType${priority}`] =
              convertTransferType(transferType);
          } else if (transferType && !currentDestination) {
            // فقط نوع انتقال تغییر کرده برای اولویت خالی
            // در این حالت چیزی ذخیره نمی‌کنیم چون مقصدی وجود ندارد
          }
        }
      }
    });

    // به‌روزرسانی در دیتابیس
    const updatedSpecs = await TransferApplicantSpec.findByIdAndUpdate(
      userSpecs._id,
      updateData,
      { new: true }
    );

    // اضافه کردن log به statusLog
    try {
      const changedPriorities = [];
      const changedTransferTypes = [];

      // بررسی تغییرات
      destinationPriorities.forEach((item) => {
        const { priority, destinationCode, transferType } = item;

        if (priority >= 1 && priority <= 7) {
          const fieldName = `destinationPriority${priority}`;
          const currentDestination = userSpecs[fieldName];

          // بررسی تغییر مقصد
          if (destinationCode && destinationCode.trim() !== "") {
            if (userSpecs.canEditDestination) {
              // کاربر با دسترسی کامل - بررسی تغییر مقصد موجود
              if (
                currentDestination &&
                currentDestination.districtCode !== destinationCode
              ) {
                changedPriorities.push({
                  priority: priority,
                  from: currentDestination.districtCode,
                  to: destinationCode,
                  action: "modified",
                });
              }
            } else {
              // کاربر با دسترسی محدود - بررسی اضافه کردن مقصد جدید
              if (!currentDestination || !currentDestination.districtCode) {
                changedPriorities.push({
                  priority: priority,
                  from: "خالی",
                  to: destinationCode,
                  action: "added",
                });
              }
            }
          }

          // بررسی تغییر نوع انتقال
          const newTransferType = convertTransferType(transferType);
          if (
            currentDestination &&
            currentDestination.transferType !== newTransferType
          ) {
            changedTransferTypes.push({
              priority: priority,
              from: currentDestination.transferType,
              to: newTransferType,
              fromText: getTransferTypeText(currentDestination.transferType),
              toText: transferType,
            });
          }
        }
      });

      // اگر تغییری وجود دارد، log را اضافه کن
      if (changedPriorities.length > 0 || changedTransferTypes.length > 0) {
        const metadata = {
          changedPriorities: changedPriorities,
          changedTransferTypes: changedTransferTypes,
          canEditDestination: userSpecs.canEditDestination,
          totalChanges: changedPriorities.length + changedTransferTypes.length,
          step: 4,
          actionType: "destination_priorities_update",
        };

        let comment = "تغییرات مرحله 4: ";
        if (changedPriorities.length > 0) {
          comment += `${changedPriorities.length} مقصد`;
        }
        if (changedTransferTypes.length > 0) {
          if (changedPriorities.length > 0) comment += " و ";
          comment += `${changedTransferTypes.length} نوع انتقال`;
        }
        comment += " تغییر یافت";

        // تغییر وضعیت درخواست با استفاده از workflow جدید
        updatedSpecs.changeRequestStatus({
          status: "awaiting_user_approval",
          changedBy: userAuth.id,
          reason: comment,
          metadata: metadata,
          userAgent: request.headers.get("user-agent") || "",
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "",
        });

        await updatedSpecs.save();
      }
    } catch (logError) {
      console.error("Error adding status log:", logError);
      // ادامه می‌دهیم حتی اگر log ثبت نشود
    }

    return NextResponse.json({
      success: true,
      message: "تغییرات با موفقیت ذخیره شد",
      data: updatedSpecs,
    });
  } catch (error) {
    console.error("Error updating destination priorities:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره تغییرات" },
      { status: 500 }
    );
  }
}
