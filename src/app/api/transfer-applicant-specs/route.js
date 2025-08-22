import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import User from "@/models/User";
import District from "@/models/District";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// دریافت لیست مشخصات پرسنل
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }
    console.log("userAuth--->", userAuth);
    // بررسی دسترسی
    if (
      ![
        ROLES.SYSTEM_ADMIN,
        ROLES.PROVINCE_TRANSFER_EXPERT,
        ROLES.DISTRICT_TRANSFER_EXPERT,
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const requestStatus = searchParams.get("requestStatus") || "";
    const currentRequestStatus = searchParams.get("currentRequestStatus") || "";
    const employmentType = searchParams.get("employmentType") || "";
    const gender = searchParams.get("gender") || "";
    const currentWorkPlaceCode = searchParams.get("currentWorkPlaceCode") || "";

    // ساخت query
    let query = {};

    // فیلتر جستجو
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { personnelCode: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }

    // فیلتر وضعیت
    if (status) {
      if (status === "active") {
        query.isActive = true;
      } else if (status === "inactive") {
        query.isActive = false;
      } else {
        query.currentRequestStatus = status;
      }
    }

    // فیلتر وضعیت درخواست مستقل
    if (requestStatus) {
      query.currentRequestStatus = requestStatus;
    }

    // فیلتر وضعیت درخواست جدید (از فرانت‌اند)
    if (currentRequestStatus) {
      query.currentRequestStatus = currentRequestStatus;
    }

    // فیلتر نوع استخدام
    if (employmentType) {
      query.employmentType = employmentType;
    }

    // فیلتر جنسیت
    if (gender) {
      query.gender = gender;
    }
    if (currentWorkPlaceCode) {
      query.currentWorkPlaceCode = currentWorkPlaceCode;
    }

    // Debug log
    console.log("API Filters:", {
      requestStatus,
      currentRequestStatus,
      employmentType,
      gender,
      currentWorkPlaceCode,
      status,
      search,
      userRole: userAuth.role,
      userProvince: userAuth.province,
      userDistrict: userAuth.district,
    });
    console.log(
      "Final Query (before role filters):",
      JSON.stringify(query, null, 2)
    );

    // فیلتر استانی برای کارشناس امور اداری استان
    if (userAuth.role === ROLES.PROVINCE_TRANSFER_EXPERT && userAuth.province) {
      // اگر province یک object است، _id آن را استخراج کنیم
      const userProvinceId =
        typeof userAuth.province === "object" && userAuth.province._id
          ? userAuth.province._id
          : userAuth.province;

      const provinceDistricts = await District.find({
        province: userProvinceId,
      }).select("code");
      const districtCodes = provinceDistricts.map((d) => d.code);

      // ترکیب فیلتر استانی با جستجوی موجود
      const provinceFilter = [
        { sourceDistrictCode: { $in: districtCodes } },
        { currentWorkPlaceCode: { $in: districtCodes } },
      ];

      if (query.$or) {
        // اگر جستجو وجود دارد، آن را با فیلتر استانی ترکیب کنیم
        query.$and = [
          { $or: query.$or }, // شرایط جستجو
          { $or: provinceFilter }, // شرایط استانی
        ];
        delete query.$or;
      } else {
        // اگر جستجو وجود ندارد، فقط فیلتر استانی را اعمال کنیم
        query.$or = provinceFilter;
      }
    }

    // فیلتر منطقه‌ای برای کارشناس امور اداری منطقه
    if (userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT && userAuth.district) {
      // اگر district یک object است، code آن را استخراج کنیم
      const districtCode =
        typeof userAuth.district === "object" && userAuth.district.code
          ? userAuth.district.code
          : userAuth.district;

      if (districtCode) {
        query.currentWorkPlaceCode = districtCode;
      }
    }

    // Debug log نهایی
    console.log(
      "Final Query (after role filters):",
      JSON.stringify(query, null, 2)
    );

    const skip = (page - 1) * limit;

    const [specs, total] = await Promise.all([
      TransferApplicantSpec.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TransferApplicantSpec.countDocuments(query),
    ]);

    // تبدیل ObjectId ها به string
    const formattedSpecs = specs.map((spec) => ({
      ...spec,
      _id: spec._id.toString(),
      createdBy: spec.createdBy
        ? {
            ...spec.createdBy,
            _id: spec.createdBy._id.toString(),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      specs: formattedSpecs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/transfer-applicant-specs:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات مشخصات پرسنل" },
      { status: 500 }
    );
  }
}

// ایجاد مشخصات پرسنل جدید
export async function POST(request) {
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
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // اعتبارسنجی فیلدهای ضروری
    const requiredFields = [
      "firstName",
      "lastName",
      "personnelCode",
      "employmentType",
      "gender",
      "mobile",
      "effectiveYears",
      "employmentField",
      "fieldCode",
      "approvedScore",
      "requestedTransferType",
      "currentWorkPlaceCode",
      "sourceDistrictCode",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `فیلد ${field} الزامی است` },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // بررسی یکتا بودن کد پرسنلی
    const existingSpec = await TransferApplicantSpec.findOne({
      personnelCode: data.personnelCode,
    });

    if (existingSpec) {
      return NextResponse.json(
        { success: false, error: "کد پرسنلی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // بررسی یکتا بودن کد ملی در صورت وجود
    if (data.nationalId) {
      const existingNationalId = await TransferApplicantSpec.findOne({
        nationalId: data.nationalId,
      });

      if (existingNationalId) {
        return NextResponse.json(
          { success: false, error: "کد ملی قبلاً ثبت شده است" },
          { status: 400 }
        );
      }
    }

    // اعتبارسنجی کدهای منطقه
    if (data.currentWorkPlaceCode) {
      const currentDistrict = await District.findOne({
        code: data.currentWorkPlaceCode,
      });
      if (!currentDistrict) {
        return NextResponse.json(
          { success: false, error: "کد محل خدمت نامعتبر است" },
          { status: 400 }
        );
      }
    }

    if (data.sourceDistrictCode) {
      const sourceDistrict = await District.findOne({
        code: data.sourceDistrictCode,
      });
      if (!sourceDistrict) {
        return NextResponse.json(
          { success: false, error: "کد مبدا نامعتبر است" },
          { status: 400 }
        );
      }
    }

    // ایجاد مشخصات پرسنل
    const newSpec = new TransferApplicantSpec({
      ...data,
      createdBy: userAuth.userId,
    });

    // تنظیم وضعیت اولیه با استفاده از workflow جدید
    newSpec.changeRequestStatus({
      status: "user_no_action",
      changedBy: userAuth.id,
      reason: "ایجاد مشخصات پرسنل",
      metadata: {
        personnelCode: newSpec.personnelCode,
        nationalId: newSpec.nationalId,
        createdBy: userAuth.role,
        creationMethod: "manual",
      },
      userAgent: request.headers.get("user-agent") || "",
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "",
    });

    await newSpec.save();

    // ایجاد خودکار کاربر در جدول users (در صورت وجود کد ملی)
    if (data.nationalId) {
      try {
        // بررسی اینکه کاربر با این کد ملی قبلاً وجود ندارد
        const existingUser = await User.findOne({
          nationalId: data.nationalId,
        });

        if (!existingUser) {
          // دریافت اطلاعات منطقه برای تعیین province و district
          const district = await District.findById(
            data.currentWorkPlaceCode
          ).populate("province");

          if (!district) {
            console.warn(
              `District not found for code: ${data.currentWorkPlaceCode}`
            );
          }

          // هش کردن رمز عبور (کد ملی)
          const hashedPassword = await bcrypt.hash(data.nationalId, 12);

          // ایجاد کاربر جدید
          const newUser = new User({
            nationalId: data.nationalId,
            password: hashedPassword,
            fullName: `${data.firstName} ${data.lastName}`,
            role: ROLES.TRANSFER_APPLICANT,
            province: district?.province?._id || userAuth.province,
            district: district?._id || null,
            phone: data.mobile,
            isActive: true,
          });

          await newUser.save();
          console.log(
            `User created automatically for transfer applicant: ${data.nationalId}`
          );
        }
      } catch (userCreationError) {
        console.error("Error creating user:", userCreationError);
        // ادامه می‌دهیم حتی اگر ایجاد کاربر با خطا روبرو شود
      }
    }

    return NextResponse.json({
      success: true,
      message: "مشخصات پرسنل با موفقیت ایجاد شد",
      spec: {
        ...newSpec.toObject(),
        _id: newSpec._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error in POST /api/transfer-applicant-specs:", error);

    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { success: false, error: errorMessages.join(", ") },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "کد پرسنلی یا کد ملی تکراری است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "خطا در ایجاد مشخصات پرسنل" },
      { status: 500 }
    );
  }
}

// ویرایش مشخصات پرسنل
export async function PUT(request) {
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
      ].includes(userAuth.role)
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه مشخصات پرسنل الزامی است" },
        { status: 400 }
      );
    }

    await connectDB();

    const spec = await TransferApplicantSpec.findById(id);
    if (!spec) {
      return NextResponse.json(
        { success: false, error: "مشخصات پرسنل یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی یکتا بودن کد پرسنلی (در صورت تغییر)
    if (
      updateData.personnelCode &&
      updateData.personnelCode !== spec.personnelCode
    ) {
      const existingSpec = await TransferApplicantSpec.findOne({
        personnelCode: updateData.personnelCode,
        _id: { $ne: id },
      });

      if (existingSpec) {
        return NextResponse.json(
          { success: false, error: "کد پرسنلی قبلاً ثبت شده است" },
          { status: 400 }
        );
      }
    }

    // بررسی یکتا بودن کد ملی (در صورت تغییر)
    if (updateData.nationalId && updateData.nationalId !== spec.nationalId) {
      const existingNationalId = await TransferApplicantSpec.findOne({
        nationalId: updateData.nationalId,
        _id: { $ne: id },
      });

      if (existingNationalId) {
        return NextResponse.json(
          { success: false, error: "کد ملی قبلاً ثبت شده است" },
          { status: 400 }
        );
      }
    }

    // track کردن تغییرات مهم
    const originalData = {
      currentRequestStatus: spec.currentRequestStatus,
      currentTransferStatus: spec.currentTransferStatus,
      isActive: spec.isActive,
    };

    // اعتبارسنجی کدهای منطقه در صورت وجود
    if (updateData.currentWorkPlaceCode) {
      const currentDistrict = await District.findOne({
        code: updateData.currentWorkPlaceCode,
      });
      if (!currentDistrict) {
        return NextResponse.json(
          { success: false, error: "کد محل خدمت نامعتبر است" },
          { status: 400 }
        );
      }
    }

    if (updateData.sourceDistrictCode) {
      const sourceDistrict = await District.findOne({
        code: updateData.sourceDistrictCode,
      });
      if (!sourceDistrict) {
        return NextResponse.json(
          { success: false, error: "کد مبدا نامعتبر است" },
          { status: 400 }
        );
      }
    }

    // به‌روزرسانی
    Object.assign(spec, updateData);

    // بررسی تغییرات و اضافه کردن log مناسب
    if (
      updateData.currentRequestStatus &&
      updateData.currentRequestStatus !== originalData.currentRequestStatus
    ) {
      // استفاده از workflow جدید برای تغییر وضعیت
      spec.changeRequestStatus({
        status: updateData.currentRequestStatus,
        changedBy: userAuth.id,
        reason: `تغییر وضعیت درخواست از ${spec.getRequestStatusText(
          originalData.currentRequestStatus
        )} به ${spec.getRequestStatusText(updateData.currentRequestStatus)}`,
        metadata: {
          originalStatus: originalData.currentRequestStatus,
          newStatus: updateData.currentRequestStatus,
          changedByRole: userAuth.role,
          updateMethod: "manual_edit",
        },
        userAgent: request.headers.get("user-agent") || "",
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "",
      });
    }

    if (
      updateData.currentTransferStatus &&
      updateData.currentTransferStatus !== originalData.currentTransferStatus
    ) {
      spec.addStatusLog({
        fromStatus: originalData.currentTransferStatus?.toString(),
        toStatus: updateData.currentTransferStatus?.toString(),
        actionType: "status_change",
        performedBy: userAuth.userId,
        comment: `تغییر وضعیت فعلی انتقال`,
        metadata: {
          originalTransferStatus: originalData.currentTransferStatus,
          newTransferStatus: updateData.currentTransferStatus,
        },
      });
    }

    if (
      updateData.isActive !== undefined &&
      updateData.isActive !== originalData.isActive
    ) {
      spec.addStatusLog({
        fromStatus: originalData.isActive ? "active" : "inactive",
        toStatus: updateData.isActive ? "active" : "inactive",
        actionType: updateData.isActive ? "activated" : "deactivated",
        performedBy: userAuth.userId,
        comment: updateData.isActive ? "فعال کردن پرسنل" : "غیرفعال کردن پرسنل",
        metadata: {
          originalActive: originalData.isActive,
          newActive: updateData.isActive,
        },
      });
    }

    // اگر تغییر خاصی نبود، یک log کلی update اضافه کن
    if (
      !updateData.currentRequestStatus &&
      !updateData.currentTransferStatus &&
      updateData.isActive === undefined
    ) {
      spec.addStatusLog({
        toStatus: spec.currentRequestStatus || "updated",
        actionType: "updated",
        performedBy: userAuth.userId,
        comment: "ویرایش مشخصات پرسنل",
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });
    }

    await spec.save();

    // به‌روزرسانی کاربر مرتبط در صورت وجود
    if (spec.nationalId) {
      try {
        const relatedUser = await User.findOne({ nationalId: spec.nationalId });
        if (relatedUser) {
          relatedUser.fullName = `${spec.firstName} ${spec.lastName}`;
          relatedUser.phone = spec.mobile;
          await relatedUser.save();
        }
      } catch (userUpdateError) {
        console.error("Error updating related user:", userUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "مشخصات پرسنل با موفقیت ویرایش شد",
      spec: {
        ...spec.toObject(),
        _id: spec._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/transfer-applicant-specs:", error);

    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { success: false, error: errorMessages.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "خطا در ویرایش مشخصات پرسنل" },
      { status: 500 }
    );
  }
}

// حذف مشخصات پرسنل
export async function DELETE(request) {
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
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه مشخصات پرسنل الزامی است" },
        { status: 400 }
      );
    }

    await connectDB();

    const spec = await TransferApplicantSpec.findById(id);
    if (!spec) {
      return NextResponse.json(
        { success: false, error: "مشخصات پرسنل یافت نشد" },
        { status: 404 }
      );
    }

    await TransferApplicantSpec.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "مشخصات پرسنل با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error in DELETE /api/transfer-applicant-specs:", error);
    return NextResponse.json(
      { success: false, error: "خطا در حذف مشخصات پرسنل" },
      { status: 500 }
    );
  }
}
