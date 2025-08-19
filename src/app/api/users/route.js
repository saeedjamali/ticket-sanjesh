import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import ExamCenter from "@/models/ExamCenter";
import Province from "@/models/Province";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import { ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authService } from "@/lib/auth/authService";

// GET /api/users - دریافت لیست کاربران
export async function GET(request) {
  try {
    await connectDB();

    const userAuth = await authService.validateToken(request);

    // console.log("userAuth--------------->", userAuth);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    // console.log("searchParams--------------->", searchParams);
    const role = searchParams.get("role");
    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const examCenter = searchParams.get("examCenter");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const query = {};

    if (role) {
      query.role = role;
    }

    if (province) {
      query.province = province;
    }

    if (district) {
      query.district = district;
    }

    if (examCenter) {
      query.examCenter = examCenter;
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }

    // محدودیت‌های دسترسی بر اساس نقش
    if (userAuth.role !== ROLES.SYSTEM_ADMIN) {
      if (
        userAuth.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
        userAuth.role === ROLES.PROVINCE_TECH_EXPERT ||
        userAuth.role === ROLES.PROVINCE_EVAL_EXPERT
      ) {
        // کارشناسان استان فقط می‌توانند کاربران استان خود را ببینند
        query.province = userAuth.province;
        query.role = { $nin: [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER] };
      } else if (userAuth.role === ROLES.DISTRICT_TECH_EXPERT || userAuth.role === ROLES.DISTRICT_REGISTRATION_EXPERT ) {
        // کارشناسان منطقه فقط می‌توانند کاربران منطقه خود را ببینند
        query.district = userAuth.district;
        query.role = {
          $nin: [
            ROLES.SYSTEM_ADMIN,
            ROLES.GENERAL_MANAGER,
            ROLES.PROVINCE_EDUCATION_EXPERT,
            ROLES.PROVINCE_TECH_EXPERT,
            ROLES.PROVINCE_EVAL_EXPERT,
          ],
        };
      }
    }

    const users = await User.find(query)
      .select("-password")
      .populate("province", "name")
      .populate("district", "name")
      .populate("examCenter", "name")
      .sort({ createdAt: -1 })
      .lean();

    // تبدیل ObjectId‌ها به رشته
    const formattedUsers = users.map((user) => ({
      ...user,
      _id: user._id.toString(),
      province: user.province
        ? {
            ...user.province,
            _id: user.province._id.toString(),
          }
        : null,
      district: user.district
        ? {
            ...user.district,
            _id: user.district._id.toString(),
          }
        : null,
      examCenter: user.examCenter
        ? {
            ...user.examCenter,
            _id: user.examCenter._id.toString(),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت اطلاعات کاربران",
      },
      { status: 500 }
    );
  }
}

// POST /api/users - ایجاد کاربر جدید
export async function POST(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const data = await request.json();

    // اعتبارسنجی فیلدهای اجباری
    if (!data.fullName || !data.nationalId || !data.password || !data.role) {
      return NextResponse.json(
        { success: false, error: "لطفاً همه فیلدهای اجباری را تکمیل کنید" },
        { status: 400 }
      );
    }

    // بررسی دسترسی کاربر برای ایجاد نقش
    let hasPermission = false;

    if (userAuth.role === ROLES.SYSTEM_ADMIN) {
      // مدیر سیستم می‌تواند هر نوع کاربری را ایجاد کند
      hasPermission = true;
    } else if (userAuth.role === ROLES.GENERAL_MANAGER) {
      // مدیر کل می‌تواند کارشناسان استان را ایجاد کند
      if (
        [
          ROLES.PROVINCE_EDUCATION_EXPERT,
          ROLES.PROVINCE_TECH_EXPERT,
          ROLES.PROVINCE_EVAL_EXPERT,
          ROLES.PROVINCE_REGISTRATION_EXPERT,
        ].includes(data.role)
      ) {
        hasPermission = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TECH_EXPERT) {
      // کارشناس فناوری استان می‌تواند کارشناسان منطقه را ایجاد کند
      if (
        [
          ROLES.DISTRICT_EDUCATION_EXPERT,
          ROLES.DISTRICT_TECH_EXPERT,
          ROLES.DISTRICT_EVAL_EXPERT,
          ROLES.DISTRICT_REGISTRATION_EXPERT,
        ].includes(data.role)
      ) {
        hasPermission = true;
        // باید برای استان خودشان باشد
        if (data.province !== userAuth.province) {
          hasPermission = false;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "شما دسترسی لازم برای ایجاد این نوع کاربر را ندارید",
        },
        { status: 403 }
      );
    }

    // بررسی تکراری نبودن کد ملی
    const existingUser = await User.findOne({ nationalId: data.nationalId });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "کاربری با این کد ملی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // بررسی فیلدهای اجباری بر اساس نقش
    const requiresProvince = [
      ROLES.PROVINCE_EDUCATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.PROVINCE_EVAL_EXPERT,
      ROLES.PROVINCE_REGISTRATION_EXPERT,
      ROLES.DISTRICT_EDUCATION_EXPERT,
      ROLES.DISTRICT_TECH_EXPERT,
      ROLES.DISTRICT_EVAL_EXPERT,
      ROLES.DISTRICT_REGISTRATION_EXPERT,
      ROLES.EXAM_CENTER_MANAGER,
    ];

    const requiresDistrict = [
      ROLES.DISTRICT_EDUCATION_EXPERT,
      ROLES.DISTRICT_TECH_EXPERT,
      ROLES.DISTRICT_EVAL_EXPERT,
      ROLES.DISTRICT_REGISTRATION_EXPERT,
      ROLES.EXAM_CENTER_MANAGER,
    ];

    const requiresExamCenter = [ROLES.EXAM_CENTER_MANAGER];

    if (requiresProvince.includes(data.role) && !data.province) {
      return NextResponse.json(
        { success: false, error: "انتخاب استان برای این نقش الزامی است" },
        { status: 400 }
      );
    }

    if (requiresDistrict.includes(data.role) && !data.district) {
      return NextResponse.json(
        { success: false, error: "انتخاب منطقه برای این نقش الزامی است" },
        { status: 400 }
      );
    }

    if (requiresExamCenter.includes(data.role) && !data.examCenter) {
      return NextResponse.json(
        {
          success: false,
          error: "انتخاب واحد سازمانی برای این نقش الزامی است",
        },
        { status: 400 }
      );
    }

    // دریافت سال تحصیلی فعال
    const academicYear = await mongoose
      .model("AcademicYear")
      .findOne({ isActive: true });

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: "هیچ سال تحصیلی فعالی یافت نشد" },
        { status: 400 }
      );
    }

    // رمزنگاری رمز عبور
    // const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, 12);
    //console.log("hashedPassword 11---->", hashedPassword);
    // ایجاد کاربر جدید
    const user = await User.create({
      fullName: data.fullName.trim(),
      nationalId: data.nationalId.trim(),
      password: hashedPassword,
      role: data.role,
      province: data.province || null,
      district: data.district || null,
      examCenter: data.examCenter || null,
      isActive: true,
      createdAt: new Date(),
      academicYear: academicYear.name,
    });
    //console.log("hashedPassword 22---->", hashedPassword);
   // console.log("user---->", user);
    if (requiresExamCenter.includes(data.role)) {
      await ExamCenter.findByIdAndUpdate(data.examCenter, {
        manager: user._id,
      });
    }
    // حذف رمز عبور از پاسخ
    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json(
      {
        success: true,
        user: {
          ...userResponse,
          _id: userResponse._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/users:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد کاربر جدید" },
      { status: 500 }
    );
  }
}

// PUT /api/users - بروزرسانی کاربر
export async function PUT(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { success: false, error: "شناسه کاربر الزامی است" },
        { status: 400 }
      );
    }

    const user = await User.findById(data.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "کاربر مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی برای ویرایش کاربر
    let hasPermission = false;

    if (userAuth.role === ROLES.SYSTEM_ADMIN) {
      // مدیر سیستم می‌تواند هر کاربری را ویرایش کند
      hasPermission = true;
    } else if (userAuth.role === ROLES.GENERAL_MANAGER) {
      // مدیر کل می‌تواند کارشناسان استان را ویرایش کند
      if (
        [
          ROLES.PROVINCE_EDUCATION_EXPERT,
          ROLES.PROVINCE_TECH_EXPERT,
          ROLES.PROVINCE_EVAL_EXPERT,
        ].includes(user.role)
      ) {
        hasPermission = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TECH_EXPERT) {
      // کارشناس فناوری استان می‌تواند کارشناسان منطقه را ویرایش کند
      if (
        [
          ROLES.DISTRICT_EDUCATION_EXPERT,
          ROLES.DISTRICT_TECH_EXPERT,
          ROLES.DISTRICT_EVAL_EXPERT,
        ].includes(user.role)
      ) {
        hasPermission = true;
        // باید برای استان خودشان باشد
        if (user.province.toString() !== userAuth.province) {
          hasPermission = false;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "شما دسترسی لازم برای ویرایش این کاربر را ندارید",
        },
        { status: 403 }
      );
    }

    // بروزرسانی فیلدها
    if (data.fullName) {
      user.fullName = data.fullName.trim();
    }

    if (data.nationalId && data.nationalId !== user.nationalId) {
      // بررسی تکراری نبودن کد ملی جدید
      const existingUser = await User.findOne({
        nationalId: data.nationalId,
        _id: { $ne: data.id },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "کاربری با این کد ملی قبلاً ثبت شده است" },
          { status: 400 }
        );
      }

      user.nationalId = data.nationalId.trim();
    }

    // فقط مدیر سیستم و مدیر کل می‌توانند نقش را تغییر دهند
    if (
      data.role &&
      [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER].includes(userAuth.role)
    ) {
      user.role = data.role;
    }

    // بروزرسانی فیلدهای مکانی با توجه به دسترسی
    if (
      data.province &&
      [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER].includes(userAuth.role)
    ) {
      user.province = data.province;
    }

    if (
      data.district &&
      [
        ROLES.SYSTEM_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.PROVINCE_TECH_EXPERT,
      ].includes(userAuth.role)
    ) {
      user.district = data.district;
    }

    if (
      data.examCenter &&
      [
        ROLES.SYSTEM_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.PROVINCE_TECH_EXPERT,
        ROLES.DISTRICT_TECH_EXPERT,
      ].includes(userAuth.role)
    ) {
      user.examCenter = data.examCenter;
    }

    // فقط مدیر سیستم و مدیر کل می‌توانند وضعیت فعال بودن را تغییر دهند
    if (
      data.isActive !== undefined &&
      [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER].includes(userAuth.role)
    ) {
      // جلوگیری از غیرفعال کردن آخرین مدیر سیستم
      if (user.role === ROLES.SYSTEM_ADMIN && user.isActive && !data.isActive) {
        const activeAdminsCount = await User.countDocuments({
          role: ROLES.SYSTEM_ADMIN,
          isActive: true,
          _id: { $ne: user._id },
        });

        if (activeAdminsCount === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "امکان غیرفعال کردن آخرین مدیر سیستم وجود ندارد",
            },
            { status: 400 }
          );
        }
      }

      user.isActive = data.isActive;
    }

    await user.save();

    // حذف رمز عبور از پاسخ
    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json({
      success: true,
      user: {
        ...userResponse,
        _id: userResponse._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/users:", error);
    return NextResponse.json(
      { success: false, error: "خطا در بروزرسانی کاربر" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/password - Change user password
export async function PATCH(request) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();

    // Validate required fields
    if (!data.id || !data.password) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    const user = await User.findById(data.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to change this user's password
    let hasPermission = false;

    if (userAuth.role === ROLES.SYSTEM_ADMIN) {
      // System admin can change any user's password
      hasPermission = true;
    } else if (userAuth.role === ROLES.GENERAL_MANAGER) {
      // General manager can change province experts' passwords
      if (
        [
          ROLES.PROVINCE_EDUCATION_EXPERT,
          ROLES.PROVINCE_TECH_EXPERT,
          ROLES.PROVINCE_EVAL_EXPERT,
        ].includes(user.role)
      ) {
        hasPermission = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TECH_EXPERT) {
      // Province tech expert can change district experts' passwords
      if (
        [
          ROLES.DISTRICT_EDUCATION_EXPERT,
          ROLES.DISTRICT_TECH_EXPERT,
          ROLES.DISTRICT_EVAL_EXPERT,
           ROLES.DISTRICT_REGISTRATION_EXPERT
        ].includes(user.role)
      ) {
        hasPermission = true;

        // Must be for their own province
        if (user.province.toString() !== userAuth.province) {
          hasPermission = false;
        }
      }
    } else if (userAuth.role === ROLES.DISTRICT_TECH_EXPERT || userAuth.role === ROLES.DISTRICT_REGISTRATION_EXPERT) {
      // District tech expert can change exam center managers' passwords
      if (user.role === ROLES.EXAM_CENTER_MANAGER) {
        hasPermission = true;

        // Must be for their own district
        if (user.district.toString() !== userAuth.district) {
          hasPermission = false;
        }
      }
    } else if (userAuth.id === user._id.toString()) {
      // Users can change their own password
      // For changing own password, current password should be verified in a real system
      hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Hash new password
    // const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    console.log("hashedPassword---->", hashedPassword);
    // Update password
    user.password = hashedPassword;
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/users/password:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
