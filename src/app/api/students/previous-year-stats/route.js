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

    // دریافت سال تحصیلی قبل
    const currentYear = await AcademicYear.findOne({ isActive: true });
    if (!currentYear) {
      return NextResponse.json(
        { success: false, message: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    // محاسبه سال قبل
    const currentYearNumber = parseInt(currentYear.name.split("-")[0]);
    const previousYearName = `${currentYearNumber - 1}-${currentYearNumber}`;

    // ساخت فیلتر بر اساس نقش کاربر
    let filter = {
      academicYear: previousYearName,
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

    console.log("Previous year stats filter:", filter);
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
      examCenterStatsTotal,
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
              $lookup: {
                from: "examcenterstats",
                let: { districtCode: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$districtCode", "$$districtCode"] },
                          { $eq: ["$academicYear", previousYearName] },
                        ],
                      },
                    },
                  },
                ],
                as: "examCenterStats",
              },
            },
            {
              $addFields: {
                examCenterTotal: {
                  $reduce: {
                    input: "$examCenterStats",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.totalStudents"] },
                  },
                },
                examCenterMale: {
                  $reduce: {
                    input: "$examCenterStats",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.maleStudents"] },
                  },
                },
                examCenterFemale: {
                  $reduce: {
                    input: "$examCenterStats",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.femaleStudents"] },
                  },
                },
                registrationPercentage: {
                  $cond: [
                    {
                      $gt: [
                        {
                          $reduce: {
                            input: "$examCenterStats",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.totalStudents"] },
                          },
                        },
                        0,
                      ],
                    },
                    {
                      $round: [
                        {
                          $multiply: [
                            {
                              $divide: [
                                "$count",
                                {
                                  $reduce: {
                                    input: "$examCenterStats",
                                    initialValue: 0,
                                    in: {
                                      $add: ["$$value", "$$this.totalStudents"],
                                    },
                                  },
                                },
                              ],
                            },
                            100,
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
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
                      // آمار ExamCenterStats برای این دوره
                      examCenterTotal: {
                        $reduce: {
                          input: {
                            $filter: {
                              input: "$examCenterStats",
                              cond: { $eq: ["$$this.courseName", "$$course"] },
                            },
                          },
                          initialValue: 0,
                          in: { $add: ["$$value", "$$this.totalStudents"] },
                        },
                      },
                      courseRegistrationPercentage: {
                        $let: {
                          vars: {
                            examTotal: {
                              $reduce: {
                                input: {
                                  $filter: {
                                    input: "$examCenterStats",
                                    cond: {
                                      $eq: ["$$this.courseName", "$$course"],
                                    },
                                  },
                                },
                                initialValue: 0,
                                in: {
                                  $add: ["$$value", "$$this.totalStudents"],
                                },
                              },
                            },
                            studentTotal: {
                              $size: {
                                $filter: {
                                  input: "$courseBreakdown",
                                  cond: { $eq: ["$$this.course", "$$course"] },
                                },
                              },
                            },
                          },
                          in: {
                            $cond: [
                              { $gt: ["$$examTotal", 0] },
                              {
                                $round: [
                                  {
                                    $multiply: [
                                      {
                                        $divide: [
                                          "$$studentTotal",
                                          "$$examTotal",
                                        ],
                                      },
                                      100,
                                    ],
                                  },
                                ],
                              },
                              0,
                            ],
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
                examCenterTotal: 1,
                examCenterMale: 1,
                examCenterFemale: 1,
                registrationPercentage: 1,
                courseStats: 1,
              },
            },
            { $sort: { count: -1 } },
          ])
        : [],

      // آمار کل از جدول ExamCenterStats برای محاسبه درصد ثبت نام در سامانه
      ExamCenterStats.aggregate([
        {
          $match: {
            academicYear: previousYearName,
            ...(fullUser.role === "provinceRegistrationExpert" &&
            fullUser.province?.code
              ? { provinceCode: fullUser.province.code }
              : {}),
            ...(fullUser.role === "districtRegistrationExpert" &&
            fullUser.district?.code
              ? {
                  districtCode: fullUser.district.code,
                  ...(fullUser.district.province?.code && {
                    provinceCode: fullUser.district.province.code,
                  }),
                }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: "$totalStudents" },
            totalMaleStudents: { $sum: "$maleStudents" },
            totalFemaleStudents: { $sum: "$femaleStudents" },
          },
        },
      ]),
    ]);

    // محاسبه درصد ثبت نام در سامانه
    const examCenterTotal = examCenterStatsTotal[0] || {
      totalStudents: 0,
      totalMaleStudents: 0,
      totalFemaleStudents: 0,
    };
    const registrationPercentage =
      examCenterTotal.totalStudents > 0
        ? Math.round((totalStudents / examCenterTotal.totalStudents) * 100)
        : 0;

    const stats = {
      totalStudents,
      maleStudents,
      femaleStudents,
      gradeBreakdown,
      districts: districtBreakdown,
      lastUpdated: new Date(),
      academicYear: previousYearName,
      // آمار مقایسه با ExamCenterStats
      examCenterStats: {
        totalStudents: examCenterTotal.totalStudents,
        totalMaleStudents: examCenterTotal.totalMaleStudents,
        totalFemaleStudents: examCenterTotal.totalFemaleStudents,
        registrationPercentage: registrationPercentage,
      },
    };

    console.log("Previous year stats result:", {
      totalStudents,
      maleStudents,
      femaleStudents,
      gradeCount: gradeBreakdown.length,
      districtCount: districtBreakdown.length,
      examCenterTotalCount: examCenterStatsTotal.length,
      districts: districtBreakdown.map((d) => ({
        id: d._id,
        name: d.districtName,
        count: d.count,
        examCenterTotal: d.examCenterTotal,
        registrationPercentage: d.registrationPercentage,
        courseStatsCount: d.courseStats?.length || 0,
        courses: d.courseStats?.map((c) => ({
          name: c.course,
          students: c.total,
          examTotal: c.examCenterTotal,
          percentage: c.courseRegistrationPercentage,
        })),
      })),
    });

    return NextResponse.json({
      success: true,
      stats,
      message: "آمار سال گذشته با موفقیت دریافت شد",
    });
  } catch (error) {
    console.error("Error fetching previous year stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار سال گذشته" },
      { status: 500 }
    );
  }
}
