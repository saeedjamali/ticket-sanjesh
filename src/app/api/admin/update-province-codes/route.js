import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import { authService } from "@/lib/auth/authService";

export async function POST(request) {
  try {
    await dbConnect();

    // بررسی احراز هویت
    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id);
    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // بررسی دسترسی - فقط مدیر سیستم
    if (user.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "شما دسترسی لازم را ندارید" },
        { status: 403 }
      );
    }

    // دریافت provinceCode از درخواست
    const { provinceCode = "16" } = await request.json();

    console.log(
      `🚀 شروع فرآیند به‌روزرسانی provinceCode به "${provinceCode}"...`
    );

    // شمارش رکوردهای بدون provinceCode
    const countWithoutProvince = await Student.countDocuments({
      $or: [
        { provinceCode: { $exists: false } },
        { provinceCode: null },
        { provinceCode: "" },
      ],
    });

    console.log(`📊 تعداد رکوردهای بدون provinceCode: ${countWithoutProvince}`);

    if (countWithoutProvince === 0) {
      return NextResponse.json({
        success: true,
        message: "تمام رکوردها دارای provinceCode هستند",
        data: {
          totalFound: 0,
          updated: 0,
          remaining: 0,
        },
      });
    }

    // به‌روزرسانی رکوردها
    const result = await Student.updateMany(
      {
        $or: [
          { provinceCode: { $exists: false } },
          { provinceCode: null },
          { provinceCode: "" },
        ],
      },
      {
        $set: {
          provinceCode: provinceCode,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ ${result.modifiedCount} رکورد به‌روزرسانی شد`);

    // تایید نهایی
    const remainingWithoutProvince = await Student.countDocuments({
      $or: [
        { provinceCode: { $exists: false } },
        { provinceCode: null },
        { provinceCode: "" },
      ],
    });

    // نمونه رکوردهای به‌روزرسانی شده
    const samples = await Student.find(
      { provinceCode: provinceCode },
      {
        nationalId: 1,
        firstName: 1,
        lastName: 1,
        provinceCode: 1,
        districtCode: 1,
        academicYear: 1,
      }
    )
      .limit(5)
      .lean();

    console.log(
      `🔍 رکوردهای باقی مانده بدون provinceCode: ${remainingWithoutProvince}`
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} رکورد با موفقیت به‌روزرسانی شد`,
      data: {
        totalFound: countWithoutProvince,
        updated: result.modifiedCount,
        remaining: remainingWithoutProvince,
        newProvinceCode: provinceCode,
        samples: samples.map((s) => ({
          nationalId: s.nationalId,
          fullName: `${s.firstName} ${s.lastName}`,
          provinceCode: s.provinceCode,
          districtCode: s.districtCode,
          academicYear: s.academicYear,
        })),
      },
      stats: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
      },
    });
  } catch (error) {
    console.error("Error updating province codes:", error);
    return NextResponse.json(
      { error: "خطا در به‌روزرسانی کدهای استان" },
      { status: 500 }
    );
  }
}

// GET - نمایش آمار رکوردهای بدون provinceCode
export async function GET(request) {
  try {
    await dbConnect();

    // بررسی احراز هویت
    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id);
    if (!user || user.role !== "systemAdmin") {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    // شمارش رکوردهای مختلف
    const [
      totalStudents,
      withoutProvinceCode,
      withProvinceCode,
      distinctProvinceCodes,
    ] = await Promise.all([
      Student.countDocuments({}),
      Student.countDocuments({
        $or: [
          { provinceCode: { $exists: false } },
          { provinceCode: null },
          { provinceCode: "" },
        ],
      }),
      Student.countDocuments({
        provinceCode: { $exists: true, $ne: null, $ne: "" },
      }),
      Student.distinct("provinceCode", {
        provinceCode: { $exists: true, $ne: null, $ne: "" },
      }),
    ]);

    // نمونه رکوردهای بدون provinceCode
    const samplesWithoutProvince = await Student.find(
      {
        $or: [
          { provinceCode: { $exists: false } },
          { provinceCode: null },
          { provinceCode: "" },
        ],
      },
      {
        nationalId: 1,
        firstName: 1,
        lastName: 1,
        districtCode: 1,
        academicYear: 1,
        createdAt: 1,
      }
    )
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        withoutProvinceCode,
        withProvinceCode,
        distinctProvinceCodes: distinctProvinceCodes.filter((code) => code),
        samples: samplesWithoutProvince.map((s) => ({
          nationalId: s.nationalId,
          fullName: `${s.firstName} ${s.lastName}`,
          districtCode: s.districtCode,
          academicYear: s.academicYear,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching province code stats:", error);
    return NextResponse.json({ error: "خطا در دریافت آمار" }, { status: 500 });
  }
}
