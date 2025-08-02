import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import ExamCenterStats from "@/models/ExamCenterStats";
import { authService } from "@/lib/auth/authService";

export async function GET(request) {
  try {
    await dbConnect();

    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غیر مجاز" },
        { status: 401 }
      );
    }

    // دریافت اطلاعات کامل کاربر
    const fullUser = await User.findById(user.id)
      .populate("province")
      .populate({
        path: "district",
        populate: {
          path: "province",
        },
      });

    if (!fullUser) {
      return NextResponse.json(
        { success: false, message: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی - فقط کارشناس‌های ثبت نام استان و منطقه
    if (
      !["provinceRegistrationExpert", "districtRegistrationExpert"].includes(
        fullUser.role
      )
    ) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی لازم را ندارید" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");
    const branch = searchParams.get("branch");
    const province = searchParams.get("province");

    // دریافت سال تحصیلی جاری
    const currentYear = await AcademicYear.findOne({ isActive: true });
    if (!currentYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    const currentYearName = currentYear.name;

    // ساخت فیلتر بر اساس نقش کاربر
    let filter = {
      academicYear: currentYearName,
      isActive: true,
    };

    // فیلتر بر اساس نقش کاربر
    if (
      fullUser.role === "provinceRegistrationExpert" &&
      fullUser.province?.code
    ) {
      filter.provinceCode = fullUser.province.code;
    } else if (
      fullUser.role === "districtRegistrationExpert" &&
      fullUser.district?.code
    ) {
      filter.districtCode = fullUser.district.code;
      // برای کارشناس منطقه، استان را هم فیلتر کنیم
      if (fullUser.district.province?.code) {
        filter.provinceCode = fullUser.district.province.code;
      }
    }

    // فیلترهای اضافی
    if (course) {
      // تبدیل کد دوره به نام دوره (باید از جدول Course استفاده کرد)
      // فعلاً از academicCourse استفاده می‌کنیم
    }

    if (branch) {
      // فیلتر بر اساس شاخه
    }

    if (province) {
      filter.provinceCode = province;
    }

    console.log("Current year stats filter:", filter);
    console.log("User role and codes:", {
      role: fullUser.role,
      userProvince: fullUser.province?.code,
      userDistrict: fullUser.district?.code,
      districtProvince: fullUser.district?.province?.code,
    });

    // آمار کلی
    const [
      totalStudents,
      maleStudents,
      femaleStudents,
      gradeBreakdown,
      districtBreakdown,
    ] = await Promise.all([
      // تعداد کل دانش‌آموزان
      Student.countDocuments(filter),

      // تعداد دانش‌آموزان پسر
      Student.countDocuments({ ...filter, gender: "male" }),

      // تعداد دانش‌آموزان دختر
      Student.countDocuments({ ...filter, gender: "female" }),

      // آمار به تفکیک پایه
      Student.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "coursegrades",
            let: { gradeCode: "$gradeCode" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$gradeCode", "$$gradeCode"] },
                      { $eq: ["$isActive", true] },
                    ],
                  },
                },
              },
            ],
            as: "gradeInfo",
          },
        },
        {
          $group: {
            _id: "$gradeCode",
            gradeName: {
              $first: {
                $ifNull: [
                  { $arrayElemAt: ["$gradeInfo.gradeName", 0] },
                  "$gradeName",
                ],
              },
            },
            count: { $sum: 1 },
            maleCount: {
              $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
            },
            femaleCount: {
              $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // آمار به تفکیک منطقه (تجمیع تمام دوره‌ها)
      ["provinceRegistrationExpert", "districtRegistrationExpert"].includes(
        fullUser.role
      )
        ? Student.aggregate([
            { $match: filter },
            {
              $lookup: {
                from: "districts",
                localField: "districtCode",
                foreignField: "code",
                as: "districtInfo",
              },
            },
            {
              $group: {
                _id: "$districtCode",
                districtName: {
                  $first: { $arrayElemAt: ["$districtInfo.name", 0] },
                },
                courseBreakdown: {
                  $push: {
                    course: "$academicCourse",
                    gender: "$gender",
                  },
                },
                count: { $sum: 1 },
                maleCount: {
                  $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
                },
                femaleCount: {
                  $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
                },
              },
            },
            {
              $addFields: {
                courseStats: {
                  $map: {
                    input: {
                      $setUnion: [
                        {
                          $map: {
                            input: "$courseBreakdown",
                            as: "item",
                            in: "$$item.course",
                          },
                        },
                      ],
                    },
                    as: "course",
                    in: {
                      course: "$$course",
                      total: {
                        $size: {
                          $filter: {
                            input: "$courseBreakdown",
                            cond: { $eq: ["$$this.course", "$$course"] },
                          },
                        },
                      },
                      maleCount: {
                        $size: {
                          $filter: {
                            input: "$courseBreakdown",
                            cond: {
                              $and: [
                                { $eq: ["$$this.course", "$$course"] },
                                { $eq: ["$$this.gender", "male"] },
                              ],
                            },
                          },
                        },
                      },
                      femaleCount: {
                        $size: {
                          $filter: {
                            input: "$courseBreakdown",
                            cond: {
                              $and: [
                                { $eq: ["$$this.course", "$$course"] },
                                { $eq: ["$$this.gender", "female"] },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                districtName: 1,
                count: 1,
                maleCount: 1,
                femaleCount: 1,
                courseStats: 1,
              },
            },
            { $sort: { count: -1 } },
          ])
        : [],
    ]);

    const stats = {
      totalStudents,
      maleStudents,
      femaleStudents,
      gradeBreakdown,
      districts: districtBreakdown,
      lastUpdated: new Date(),
      academicYear: currentYearName,
    };

    console.log("Current year stats result:", {
      totalStudents,
      maleStudents,
      femaleStudents,
      gradeCount: gradeBreakdown.length,
      districtCount: districtBreakdown.length,
      districts: districtBreakdown.map((d) => ({
        id: d._id,
        name: d.districtName,
        count: d.count,
        courseStatsCount: d.courseStats?.length || 0,
        courses: d.courseStats?.map((c) => ({
          name: c.course,
          students: c.total,
          maleCount: c.maleCount,
          femaleCount: c.femaleCount,
        })),
      })),
    });

    return NextResponse.json({
      success: true,
      stats,
      message: "آمار سال جاری با موفقیت دریافت شد",
    });
  } catch (error) {
    console.error("Error fetching current year stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار سال جاری" },
      { status: 500 }
    );
  }
}
