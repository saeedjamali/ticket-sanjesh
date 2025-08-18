import mongoose from "mongoose";

const smartSchoolSchema = new mongoose.Schema(
  {
    // اطلاعات اصلی
    examCenterCode: {
      type: String,
      required: [true, "کد واحد سازمانی الزامی است"],
      trim: true,
      index: true,
    },
    districtCode: {
      type: String,
      required: [true, "کد منطقه الزامی است"],
      trim: true,
      index: true,
    },
    provinceCode: {
      type: String,
      required: [true, "کد استان الزامی است"],
      trim: true,
      index: true,
    },

    // زیرساخت فنی
    internetConnection: {
      type: String,
      enum: {
        values: ["ندارد", "ADSL", "فیبر نوری", "4G/5G"],
        message: "نوع اتصال اینترنت نامعتبر است",
      },
      required: [true, "نوع اتصال اینترنت الزامی است"],
    },
    internetSpeed: {
      type: Number,
      min: [0, "سرعت اینترنت نمی‌تواند منفی باشد"],
      default: 0,
    },
    internetSpeedUnit: {
      type: String,
      enum: ["Kbps", "Mbps", "Gbps"],
      default: "Mbps",
    },
    personalInternetUsage: {
      type: Boolean,
      default: false,
    },
    wifiAvailable: {
      type: Boolean,
      default: false,
    },
    wifiCoverage: {
      type: String,
      enum: {
        values: ["", "ضعیف", "مناسب", "خوب", "عالی"],
        message: "کیفیت پوشش وای‌فای نامعتبر است",
      },
      default: "",
    },

    // تجهیزات سخت‌افزاری
    computerCount: {
      type: Number,
      min: [0, "تعداد کامپیوتر نمی‌تواند منفی باشد"],
      default: 0,
    },
    laptopCount: {
      type: Number,
      min: [0, "تعداد لپ‌تاپ نمی‌تواند منفی باشد"],
      default: 0,
    },
    tabletCount: {
      type: Number,
      min: [0, "تعداد تبلت نمی‌تواند منفی باشد"],
      default: 0,
    },
    smartBoardCount: {
      type: Number,
      min: [0, "تعداد تخته هوشمند نمی‌تواند منفی باشد"],
      default: 0,
    },
    projectorCount: {
      type: Number,
      min: [0, "تعداد ویدئو پروژکتور نمی‌تواند منفی باشد"],
      default: 0,
    },
    printerCount: {
      type: Number,
      min: [0, "تعداد چاپگر نمی‌تواند منفی باشد"],
      default: 0,
    },
    scannerCount: {
      type: Number,
      min: [0, "تعداد اسکنر نمی‌تواند منفی باشد"],
      default: 0,
    },
    hasComputerWorkshop: {
      type: Boolean,
      default: false,
    },
    computerWorkshopSystemsCount: {
      type: Number,
      min: [0, "تعداد سیستم‌های کارگاه نمی‌تواند منفی باشد"],
      default: 0,
    },

    // نرم‌افزارها و سیستم‌ها
    managementSoftware: {
      type: String,
      enum: {
        values: [
          "",
          "ندارد",
          "سامانه آموزش",
          "سیستم مدیریت مدرسه",
          "LMS",
          "سایر",
        ],
        message: "نوع نرم‌افزار مدیریت نامعتبر است",
      },
      default: "",
    },
    managementSoftwareUrl: {
      type: String,
      trim: true,
    },
    managementSoftwareSatisfaction: {
      type: String,
      enum: {
        values: ["", "خیلی کم", "کم", "متوسط", "زیاد", "خیلی زیاد"],
        message: "میزان رضایت نامعتبر است",
      },
      default: "",
    },
    antivirusSoftware: {
      type: Boolean,
      default: false,
    },
    antivirusSoftwareName: {
      type: String,
      trim: true,
    },

    // آموزش و مهارت
    teacherITSkillLevel: {
      type: String,
      enum: {
        values: ["", "مبتدی", "متوسط", "پیشرفته", "خبره"],
        message: "سطح مهارت فناوری اطلاعات معلمان نامعتبر است",
      },
      default: "",
    },
    studentITSkillLevel: {
      type: String,
      enum: {
        values: ["", "مبتدی", "متوسط", "پیشرفته", "خبره"],
        message: "سطح مهارت فناوری اطلاعات دانش‌آموزان نامعتبر است",
      },
      default: "",
    },
    itTrainingProgram: {
      type: Boolean,
      default: false,
    },

    // پرسنل فنی
    technicalStaffCode: {
      type: String,
      trim: true,
    },
    technicalStaffFirstName: {
      type: String,
      trim: true,
    },
    technicalStaffLastName: {
      type: String,
      trim: true,
    },
    technicalStaffPhone: {
      type: String,
      trim: true,
    },
    technicalStaffSkills: {
      type: String,
      trim: true,
    },

    // خدمات آنلاین
    onlineClassesCapability: {
      type: Boolean,
      default: false,
    },
    onlineClassesUrl: {
      type: String,
      trim: true,
    },
    elearningPlatform: {
      type: Boolean,
      default: false,
    },
    elearningPlatformUrl: {
      type: String,
      trim: true,
    },
    digitalLibrary: {
      type: Boolean,
      default: false,
    },
    digitalLibraryUrl: {
      type: String,
      trim: true,
    },
    onlineExamSystem: {
      type: Boolean,
      default: false,
    },
    onlineExamSystemUrl: {
      type: String,
      trim: true,
    },

    // اطلاعات کلاس‌ها
    totalClassrooms: {
      type: Number,
      min: [0, "تعداد کل کلاس‌ها نمی‌تواند منفی باشد"],
      required: [true, "تعداد کل کلاس‌ها الزامی است"],
    },
    smartClassrooms: {
      type: Number,
      min: [0, "تعداد کلاس‌های هوشمند نمی‌تواند منفی باشد"],
      required: [true, "تعداد کلاس‌های هوشمند الزامی است"],
      // validation را موقتاً غیرفعال می‌کنیم
      // validate: {
      //   validator: function (value) {
      //     // فقط زمانی که totalClassrooms بیشتر از صفر باشد، validation اعمال شود
      //     if (this.totalClassrooms > 0) {
      //       return value <= this.totalClassrooms;
      //     }
      //     return true; // اگر totalClassrooms صفر باشد، هر مقداری مجاز است
      //   },
      //   message: "تعداد کلاس‌های هوشمند نمی‌تواند بیشتر از کل کلاس‌ها باشد",
      // },
    },

    // وضعیت کلی
    smartSchoolScore: {
      type: Number,
      min: [0, "امتیاز مدرسه هوشمند نمی‌تواند منفی باشد"],
      max: [100, "امتیاز مدرسه هوشمند نمی‌تواند بیش از 100 باشد"],
      default: 0,
    },
    improvementPriorities: {
      type: [String],
      default: [],
    },
    comments: {
      type: String,
      trim: true,
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },

    // اطلاعات ثبت‌کننده
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ایندکس‌های مرکب برای جستجوی سریع‌تر
smartSchoolSchema.index({
  examCenterCode: 1,
  districtCode: 1,
  provinceCode: 1,
});
smartSchoolSchema.index({ provinceCode: 1, districtCode: 1 });
smartSchoolSchema.index({ smartSchoolScore: -1 });

// محاسبه خودکار امتیاز مدرسه هوشمند
smartSchoolSchema.methods.calculateSmartSchoolScore = function () {
  let score = 0;

  // زیرساخت فنی (30 امتیاز)
  // امتیاز اتصال اینترنت (20 امتیاز)
  const internetScores = {
    ندارد: 0,
    ADSL: 10,
    "4G/5G": 15,
    "فیبر نوری": 20,
  };
  score += internetScores[this.internetConnection] || 0;

  // امتیاز وای‌فای (10 امتیاز)
  if (this.wifiAvailable) {
    const wifiScores = { ضعیف: 3, مناسب: 5, خوب: 8, عالی: 10 };
    score += wifiScores[this.wifiCoverage] || 0;
  }

  // تجهیزات سخت‌افزاری (30 امتیاز)
  const equipmentScore = Math.min(
    30,
    (this.computerCount * 2 +
      this.laptopCount * 2 +
      this.tabletCount * 1.5 +
      this.smartBoardCount * 4 +
      this.projectorCount * 3 +
      this.printerCount * 1 +
      this.scannerCount * 1 +
      (this.hasComputerWorkshop ? this.computerWorkshopSystemsCount * 2 : 0)) /
      8
  );
  score += equipmentScore;

  // کلاس‌های هوشمند (10 امتیاز)
  if (this.totalClassrooms > 0) {
    const smartClassroomRatio = this.smartClassrooms / this.totalClassrooms;
    const classroomScore = Math.min(10, smartClassroomRatio * 10);
    score += classroomScore;
  }

  // آموزش و مهارت (20 امتیاز)
  const skillScores = { مبتدی: 2, متوسط: 4, پیشرفته: 6, خبره: 8 };
  const teacherSkillScore = skillScores[this.teacherITSkillLevel] || 0;
  const studentSkillScore = skillScores[this.studentITSkillLevel] || 0;
  score += teacherSkillScore + studentSkillScore * 0.5; // معلمان وزن بیشتری دارند

  // برنامه آموزش فناوری
  if (this.itTrainingProgram) score += 4;

  // خدمات آنلاین (15 امتیاز)
  let onlineScore = 0;
  if (this.onlineClassesCapability) onlineScore += 4;
  if (this.elearningPlatform) onlineScore += 4;
  if (this.digitalLibrary) onlineScore += 3;
  if (this.onlineExamSystem) onlineScore += 4;
  score += onlineScore;

  this.smartSchoolScore = Math.round(Math.min(100, score));
  return this.smartSchoolScore;
};

// متد برای تعیین اولویت‌های بهبود
smartSchoolSchema.methods.generateImprovementPriorities = function () {
  const priorities = [];

  // اولویت‌های زیرساخت فنی
  if (this.internetConnection === "ندارد") {
    priorities.push("تهیه اتصال اینترنت");
  } else if (this.internetConnection === "ADSL") {
    priorities.push("ارتقاء اتصال اینترنت به فیبر نوری ");
  }

  if (!this.wifiAvailable) {
    priorities.push("نصب شبکه وای‌فای ");
  } else if (this.wifiCoverage === "ضعیف" || this.wifiCoverage === "مناسب") {
    priorities.push("بهبود کیفیت پوشش وای‌فای ");
  }

  // اولویت‌های تجهیزات
  const totalComputers = this.computerCount + this.laptopCount;
  if (totalComputers === 0) {
    priorities.push("تهیه تجهیزات کامپیوتری ");
  } else if (totalComputers < 10) {
    priorities.push("افزایش تعداد تجهیزات کامپیوتری ");
  }

  if (this.smartBoardCount === 0) {
    priorities.push("تهیه تخته هوشمند ");
  }

  if (!this.hasComputerWorkshop) {
    priorities.push("راه‌اندازی کارگاه کامپیوتر ");
  }

  // اولویت‌های کلاس‌های هوشمند
  if (this.totalClassrooms > 0) {
    const smartClassroomRatio = this.smartClassrooms / this.totalClassrooms;
    if (smartClassroomRatio < 0.3) {
      priorities.push("افزایش تعداد کلاس‌های هوشمند ");
    } else if (smartClassroomRatio < 0.6) {
      priorities.push("تکمیل تجهیزات هوشمند کلاس‌ها ");
    }
  }

  // اولویت‌های آموزش و مهارت
  if (
    this.teacherITSkillLevel === "مبتدی" ||
    this.teacherITSkillLevel === "متوسط"
  ) {
    priorities.push("آموزش فناوری اطلاعات به معلمان ");
  }

  if (this.studentITSkillLevel === "مبتدی") {
    priorities.push("آموزش فناوری اطلاعات به دانش‌آموزان ");
  }

  if (!this.itTrainingProgram) {
    priorities.push("راه‌اندازی برنامه آموزش فناوری ");
  }

  // اولویت‌های خدمات آنلاین
  if (!this.onlineClassesCapability) {
    priorities.push("راه‌اندازی کلاس‌های آنلاین ");
  }

  if (!this.elearningPlatform) {
    priorities.push("استقرار پلتفرم آموزش الکترونیکی ");
  }

  if (!this.digitalLibrary) {
    priorities.push("ایجاد کتابخانه دیجیتال ");
  }

  this.improvementPriorities = priorities;
  return priorities;
};

// میدل‌ور برای محاسبه خودکار امتیاز قبل از ذخیره
smartSchoolSchema.pre("save", function (next) {
  this.calculateSmartSchoolScore();
  this.generateImprovementPriorities();
  this.lastUpdate = new Date();
  next();
});

const SmartSchool =
  mongoose.models?.SmartSchool ||
  mongoose.model("SmartSchool", smartSchoolSchema);

export default SmartSchool;
