import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import TransferRequest from "@/models/TransferRequest";
import Student from "@/models/Student";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
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
        { success: false, error: "شما مجاز به دسترسی به این بخش نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all"; // all, incoming, outgoing

    let query = {};
    let userOrgCode =
      user.organizationalUnit?.code ||
      user.organizationalUnitCode ||
      user.organizationCode ||
      user.orgCode ||
      user.examCenter?.code;

    // اگر هنوز کد پیدا نشده و examCenter یک ObjectId است، باید کد واقعی را از دیتابیس بگیریم
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
        console.error("Error fetching examCenter:", examCenterError);
      }
    }

    // اگر examCenter مستقیماً یک ObjectId string است (fallback قدیمی)
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
        console.error("Error fetching examCenter (fallback):", examCenterError);
      }
    }

    // برای کارشناسان استانی و منطقه‌ای، منطق متفاوت است
    const isProvinceExpert = [
      ROLES.PROVINCE_REGISTRATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
    ].includes(user.role);

    const isDistrictExpert = [ROLES.DISTRICT_REGISTRATION_EXPERT].includes(
      user.role
    );

    if (isProvinceExpert) {
      // کارشناسان استانی همه درخواست‌های استان خود را می‌بینند
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
          console.error("Error fetching province code:", provinceError);
        }
      }

      console.log("🔍 Province Expert Debug:", {
        userRole: user.role,
        isProvinceExpert,
        userProvinceOriginal: user.province,
        userProvinceCode,
        isObjectId: mongoose.Types.ObjectId.isValid(user.province),
        userKeys: Object.keys(user),
      });

      if (!userProvinceCode) {
        console.error("❌ Province code not found for user:", {
          province: user.province,
          role: user.role,
        });
        return NextResponse.json(
          {
            success: false,
            error: "کد استان یافت نشد. لطفا با مدیر سیستم تماس بگیرید.",
          },
          { status: 400 }
        );
      }

      // برای کارشناسان استانی، درخواست‌هایی که toSchool در استان آنها باشد
      query = {
        "toSchool.provinceCode": userProvinceCode,
      };

      console.log("🔍 Province Expert Query:", {
        query,
        userProvinceCode,
      });
    } else if (isDistrictExpert) {
      // کارشناسان منطقه فقط درخواست‌های منطقه خود را می‌بینند
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
          console.error("Error fetching district code:", districtError);
        }
      }

      console.log("🔍 District Expert Debug:", {
        userRole: user.role,
        isDistrictExpert,
        userDistrictOriginal: user.district,
        userDistrictCode,
        isObjectId: mongoose.Types.ObjectId.isValid(user.district),
        userKeys: Object.keys(user),
      });

      if (!userDistrictCode) {
        return NextResponse.json(
          {
            success: false,
            error: "کد منطقه یافت نشد. لطفا با مدیر سیستم تماس بگیرید.",
          },
          { status: 400 }
        );
      }

      // برای کارشناسان منطقه، درخواست‌هایی که toSchool در منطقه آنها باشد
      query = {
        "toSchool.districtCode": userDistrictCode,
      };

      console.log("🔍 District Expert Query:", {
        query,
        userDistrictCode,
      });
    } else {
      // برای مدیران مدارس
      if (!userOrgCode) {
        return NextResponse.json(
          {
            success: false,
            error: "کد واحد سازمانی یافت نشد. لطفا با مدیر سیستم تماس بگیرید.",
          },
          { status: 400 }
        );
      }

      // تعیین نوع درخواست‌ها برای مدیران مدارس
      switch (type) {
        case "incoming":
          // درخواست‌هایی که برای این مدرسه آمده (باید پاسخ دهد)
          query = {
            "toSchool.organizationalUnitCode": userOrgCode,
            status: "pending",
          };
          break;
        case "outgoing":
          // درخواست‌هایی که این مدرسه ارسال کرده
          query = {
            "fromSchool.organizationalUnitCode": userOrgCode,
          };
          break;
        default:
          // همه درخواست‌ها
          query = {
            $or: [
              { "fromSchool.organizationalUnitCode": userOrgCode },
              { "toSchool.organizationalUnitCode": userOrgCode },
            ],
          };
      }
    }

    const transferRequests = await TransferRequest.find(query)
      .populate("requestedBy", "firstName lastName")
      .populate("respondedBy", "firstName lastName")
      .sort({ requestDate: -1 })
      .lean();

    // تعیین currentUserOrgCode برای مدیران مدارس (خارج از loop)
    let currentUserOrgCode = null;
    if (!isProvinceExpert) {
      currentUserOrgCode =
        user.organizationalUnit?.code ||
        user.organizationalUnitCode ||
        user.organizationCode ||
        user.orgCode ||
        user.examCenter?.code;

      // اگر examCenter یک ObjectId است، باید کد آن را از دیتابیس بگیریم
      if (
        !currentUserOrgCode &&
        user.examCenter &&
        mongoose.Types.ObjectId.isValid(user.examCenter)
      ) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter)
            .select("code")
            .lean();
          if (examCenter) {
            currentUserOrgCode = examCenter.code;
          }
        } catch (examCenterError) {
          console.error(
            "Error fetching examCenter for canRespond:",
            examCenterError
          );
        }
      }

      // fallback برای examCenter ObjectId string
      if (
        !currentUserOrgCode &&
        user.examCenter &&
        typeof user.examCenter === "string" &&
        mongoose.Types.ObjectId.isValid(user.examCenter)
      ) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter)
            .select("code")
            .lean();
          if (examCenter) {
            currentUserOrgCode = examCenter.code;
          }
        } catch (examCenterError) {
          console.error(
            "Error fetching examCenter (fallback) for canRespond:",
            examCenterError
          );
        }
      }
    }

    // تکمیل اطلاعات ناقص برای درخواست‌های قدیمی
    const enrichedRequests = await Promise.all(
      transferRequests.map(async (request) => {
        let updatedRequest = { ...request };

        // بررسی و تکمیل اطلاعات مدارس در صورت نیاز
        if (
          !request.fromSchool.provinceName ||
          !request.toSchool.provinceName
        ) {
          const [fromSchool, toSchool] = await Promise.all([
            ExamCenter.findOne({
              code: request.fromSchool.organizationalUnitCode,
            })
              .populate({
                path: "district",
                select: "name code",
                populate: {
                  path: "province",
                  select: "name code",
                },
              })
              .lean(),
            ExamCenter.findOne({
              code: request.toSchool.organizationalUnitCode,
            })
              .populate({
                path: "district",
                select: "name code",
                populate: {
                  path: "province",
                  select: "name code",
                },
              })
              .lean(),
          ]);

          if (fromSchool && !request.fromSchool.provinceName) {
            updatedRequest.fromSchool = {
              ...request.fromSchool,
              provinceName: fromSchool.district?.province?.name || "نامشخص",
              provinceCode: fromSchool.district?.province?.code || "نامشخص",
              districtName:
                request.fromSchool.districtName ||
                fromSchool.district?.name ||
                "نامشخص",
            };
          }

          if (toSchool && !request.toSchool.provinceName) {
            updatedRequest.toSchool = {
              ...request.toSchool,
              provinceName: toSchool.district?.province?.name || "نامشخص",
              provinceCode: toSchool.district?.province?.code || "نامشخص",
              districtName:
                request.toSchool.districtName ||
                toSchool.district?.name ||
                "نامشخص",
            };
          }
        }

        // بررسی و تکمیل اطلاعات پایه و رشته در صورت نیاز
        if (!request.studentInfo.gradeName || !request.studentInfo.fieldName) {
          const [gradeInfo, fieldInfo] = await Promise.all([
            CourseGrade.findOne({ gradeCode: request.studentInfo.gradeCode })
              .select("gradeName")
              .lean(),
            CourseBranchField.findOne({
              fieldCode: request.studentInfo.fieldCode,
            })
              .select("fieldTitle")
              .lean(),
          ]);

          updatedRequest.studentInfo = {
            ...request.studentInfo,
            gradeName:
              request.studentInfo.gradeName || gradeInfo?.gradeName || "نامشخص",
            fieldName:
              request.studentInfo.fieldName ||
              fieldInfo?.fieldTitle ||
              "نامشخص",
          };
        }

        // تعیین اینکه آیا کاربر می‌تواند به درخواست پاسخ دهد
        let canRespond = false;
        let isIncoming = false;
        let isOutgoing = false;

        if (isProvinceExpert) {
          // کارشناسان استانی می‌توانند به درخواست‌های pending که toSchool در استان آنها باشد پاسخ دهند
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
                "Error fetching province code for canRespond:",
                provinceError
              );
            }
          }

          canRespond =
            request.status === "pending" &&
            request.toSchool.provinceCode === userProvinceCode;

          isIncoming = request.toSchool.provinceCode === userProvinceCode;
          isOutgoing = request.fromSchool.provinceCode === userProvinceCode;
        } else if (isDistrictExpert) {
          // کارشناسان منطقه می‌توانند به درخواست‌های pending که toSchool در منطقه آنها باشد پاسخ دهند
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
                "Error fetching district code for canRespond:",
                districtError
              );
            }
          }

          canRespond =
            request.status === "pending" &&
            request.toSchool.districtCode === userDistrictCode;

          isIncoming = request.toSchool.districtCode === userDistrictCode;
          isOutgoing = request.fromSchool.districtCode === userDistrictCode;
        } else {
          // مدیران مدارس فقط می‌توانند به درخواست‌های مدرسه خود پاسخ دهند
          canRespond =
            request.toSchool.organizationalUnitCode === currentUserOrgCode &&
            request.status === "pending";

          isIncoming =
            request.toSchool.organizationalUnitCode === currentUserOrgCode;
          isOutgoing =
            request.fromSchool.organizationalUnitCode === currentUserOrgCode;
        }

        return {
          ...updatedRequest,
          isIncoming: isIncoming,
          isOutgoing: isOutgoing,
          statusText: getStatusText(request.status),
          canRespond: canRespond,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedRequests,
    });
  } catch (error) {
    console.error("Error fetching transfer requests:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت درخواست‌های جابجایی" },
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

    // بررسی دسترسی - فقط مدیران مدارس (کارشناسان استانی نمی‌توانند درخواست جدید ثبت کنند)
    if (
      user.role !== ROLES.EXAM_CENTER_MANAGER &&
      user.role !== "examCenterManager"
    ) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به ثبت درخواست جابجایی نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { studentNationalId, academicYear, requestDescription } =
      await req.json();

    // اعتبارسنجی ورودی‌ها
    if (!studentNationalId || !academicYear || !requestDescription) {
      return NextResponse.json(
        { success: false, error: "لطفا تمام فیلدهای ضروری را پر کنید" },
        { status: 400 }
      );
    }

    // بررسی وجود دانش‌آموز در سال تحصیلی مشخص شده
    const existingStudent = await Student.findOne({
      nationalId: studentNationalId,
      academicYear: academicYear,
    }).lean();

    if (!existingStudent) {
      return NextResponse.json(
        {
          success: false,
          error: `دانش‌آموزی با کد ملی ${studentNationalId} در سال تحصیلی ${academicYear} در هیچ مدرسه‌ای ثبت‌نام نشده است. لطفا کد ملی و سال تحصیلی را بررسی کنید.`,
        },
        { status: 404 }
      );
    }

    // Debug: بررسی ساختار کاربر
    console.log("User data for debugging:", {
      organizationalUnit: user.organizationalUnit,
      organizationalUnitCode: user.organizationalUnitCode,
      examCenter: user.examCenter,
      district: user.district,
      districtCode: user.districtCode,
      role: user.role,
    });

    let userOrgCode =
      user.organizationalUnit?.code ||
      user.organizationalUnitCode ||
      user.organizationCode ||
      user.orgCode ||
      user.examCenter?.code;

    // اگر هنوز کد پیدا نشده و examCenter یک ObjectId است، باید کد واقعی را از دیتابیس بگیریم
    if (
      !userOrgCode &&
      user.examCenter &&
      mongoose.Types.ObjectId.isValid(user.examCenter)
    ) {
      console.log(
        "POST: ExamCenter is ObjectId, fetching code from database..."
      );
      const examCenter = await ExamCenter.findById(user.examCenter)
        .select("code")
        .lean();
      if (examCenter) {
        userOrgCode = examCenter.code;
        console.log("POST: Found examCenter code:", examCenter.code);
      }
    }

    // اگر examCenter مستقیماً یک ObjectId string است (fallback قدیمی)
    if (
      !userOrgCode &&
      user.examCenter &&
      typeof user.examCenter === "string" &&
      mongoose.Types.ObjectId.isValid(user.examCenter)
    ) {
      console.log("POST: ExamCenter fallback: fetching code from database...");
      const examCenter = await ExamCenter.findById(user.examCenter)
        .select("code")
        .lean();
      if (examCenter) {
        userOrgCode = examCenter.code;
        console.log("POST: Found examCenter code (fallback):", examCenter.code);
      }
    }

    const userDistrictCode =
      user.district?.code || user.districtCode || user.district_code;

    if (!userOrgCode) {
      return NextResponse.json(
        {
          success: false,
          error: `اطلاعات واحد سازمانی یافت نشد. اطلاعات کاربر: ${JSON.stringify(
            {
              hasOrganizationalUnit: !!user.organizationalUnit,
              hasOrganizationalUnitCode: !!user.organizationalUnitCode,
              hasOrganizationCode: !!user.organizationCode,
              hasOrgCode: !!user.orgCode,
              hasExamCenter: !!user.examCenter,
              examCenterValue: user.examCenter,
              userKeys: Object.keys(user),
            }
          )}`,
        },
        { status: 400 }
      );
    }

    // بررسی اینکه دانش‌آموز در مدرسه درخواست‌کننده نیست
    if (existingStudent.organizationalUnitCode === userOrgCode) {
      return NextResponse.json(
        {
          success: false,
          error: `دانش‌آموز ${existingStudent.firstName} ${existingStudent.lastName} با کد ملی ${studentNationalId} در حال حاضر در مدرسه شما ثبت‌نام است. نیازی به درخواست جابجایی نیست.`,
        },
        { status: 400 }
      );
    }

    // بررسی وجود درخواست قبلی برای همین دانش‌آموز
    const existingRequest = await TransferRequest.findOne({
      studentNationalId: studentNationalId,
      academicYear: academicYear,
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "درخواست جابجایی برای این دانش‌آموز قبلاً ثبت شده و در انتظار بررسی است",
        },
        { status: 400 }
      );
    }

    // دریافت اطلاعات مدرسه مبدا (درخواست‌کننده)
    const fromSchool = await ExamCenter.findOne({ code: userOrgCode })
      .populate({
        path: "district",
        select: "name code",
        populate: {
          path: "province",
          select: "name code",
        },
      })
      .lean();
    const fromDistrict = userDistrictCode
      ? await District.findOne({ code: userDistrictCode }).lean()
      : null;

    // دریافت اطلاعات مدرسه مقصد (فعلی دانش‌آموز)
    const toSchool = await ExamCenter.findOne({
      code: existingStudent.organizationalUnitCode,
    })
      .populate({
        path: "district",
        select: "name code",
        populate: {
          path: "province",
          select: "name code",
        },
      })
      .lean();
    const toDistrict = existingStudent.districtCode
      ? await District.findOne({ code: existingStudent.districtCode }).lean()
      : null;

    // دریافت نام پایه و رشته تحصیلی
    const [gradeInfo, fieldInfo] = await Promise.all([
      CourseGrade.findOne({ gradeCode: existingStudent.gradeCode })
        .select("gradeName")
        .lean(),
      CourseBranchField.findOne({ fieldCode: existingStudent.fieldCode })
        .select("fieldTitle")
        .lean(),
    ]);

    // ایجاد درخواست جابجایی
    const transferRequest = new TransferRequest({
      studentNationalId: studentNationalId,
      academicYear: academicYear,
      fromSchool: {
        organizationalUnitCode: userOrgCode,
        districtCode:
          userDistrictCode || fromSchool?.district?.code || "نامشخص",
        schoolName: fromSchool?.name || "نامشخص",
        districtName:
          fromDistrict?.name || fromSchool?.district?.name || "نامشخص",
        provinceName: fromSchool?.district?.province?.name || "نامشخص",
        provinceCode: fromSchool?.district?.province?.code || "نامشخص",
        managerName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      },
      toSchool: {
        organizationalUnitCode: existingStudent.organizationalUnitCode,
        districtCode:
          existingStudent.districtCode || toSchool?.district?.code || "نامشخص",
        schoolName: toSchool?.name || "نامشخص",
        districtName: toDistrict?.name || toSchool?.district?.name || "نامشخص",
        provinceName: toSchool?.district?.province?.name || "نامشخص",
        provinceCode: toSchool?.district?.province?.code || "نامشخص",
      },
      requestDescription: requestDescription,
      studentInfo: {
        firstName: existingStudent.firstName,
        lastName: existingStudent.lastName,
        fatherName: existingStudent.fatherName,
        birthDate: existingStudent.birthDate,
        gender: existingStudent.gender,
        nationality: existingStudent.nationality,
        mobile: existingStudent.mobile,
        address: existingStudent.address,
        academicCourse: existingStudent.academicCourse,
        gradeCode: existingStudent.gradeCode,
        gradeName: gradeInfo?.gradeName || "نامشخص",
        fieldCode: existingStudent.fieldCode,
        fieldName: fieldInfo?.fieldTitle || "نامشخص",
        studentType: existingStudent.studentType,
        isActive: existingStudent.isActive,
      },
      requestedBy: user._id || user.id,
    });

    await transferRequest.save();

    return NextResponse.json({
      success: true,
      message: "درخواست جابجایی با موفقیت ثبت شد",
      data: {
        transferRequestId: transferRequest._id,
        targetSchool: toSchool?.name || "نامشخص",
        studentName: `${existingStudent.firstName} ${existingStudent.lastName}`,
      },
    });
  } catch (error) {
    console.error("Error creating transfer request:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت درخواست جابجایی" },
      { status: 500 }
    );
  }
}

function getStatusText(status) {
  switch (status) {
    case "pending":
      return "در انتظار بررسی";
    case "approved":
      return "تایید شده";
    case "rejected":
      return "رد شده";
    default:
      return "نامشخص";
  }
}
