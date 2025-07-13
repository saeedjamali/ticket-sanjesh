import mongoose from "mongoose";

const examCenterStatsSchema = new mongoose.Schema(
  {
    organizationalUnitCode: {
      type: String,
      required: [true, "کد واحد سازمانی الزامی است"],
      trim: true,
      ref: "ExamCenter",
      validate: {
        validator: async function (code) {
          const ExamCenter = mongoose.model("ExamCenter");
          const examCenter = await ExamCenter.findOne({ code: code });
          return examCenter !== null;
        },
        message: "کد واحد سازمانی معتبر نیست",
      },
    },
    academicYear: {
      type: String,
      required: [true, "سال تحصیلی الزامی است"],
      trim: true,
      validate: {
        validator: async function (year) {
          const AcademicYear = mongoose.model("AcademicYear");
          const academicYear = await AcademicYear.findOne({ name: year });
          return academicYear !== null;
        },
        message: "سال تحصیلی معتبر نیست",
      },
    },
    courseCode: {
      type: String,
      required: [true, "کد دوره تحصیلی الزامی است"],
      trim: true,
      enum: {
        values: ["100", "200", "300", "400", "500"],
        message:
          "کد دوره تحصیلی باید یکی از مقادیر 100، 200، 300، 400، 500 باشد",
      },
    },
    courseName: {
      type: String,
      required: [true, "نام دوره تحصیلی الزامی است"],
      trim: true,
      enum: {
        values: ["پیش دبستانی", "ابتدایی", "متوسطه اول", "متوسطه دوم", "سایر"],
        message: "نام دوره تحصیلی باید یکی از مقادیر معتبر باشد",
      },
    },
    branchCode: {
      type: String,
      required: [true, "کد شاخه الزامی است"],
      trim: true,
      validate: {
        validator: async function (code) {
          const CourseBranchField = mongoose.model("CourseBranchField");
          const branch = await CourseBranchField.findOne({
            branchCode: code,
            courseCode: this.courseCode,
            isActive: true,
          });
          return branch !== null;
        },
        message: "کد شاخه معتبر نیست یا با دوره تحصیلی انتخاب شده سازگار نیست",
      },
    },
    branchTitle: {
      type: String,
      required: [true, "نام شاخه الزامی است"],
      trim: true,
    },
    totalStudents: {
      type: Number,
      required: [true, "تعداد کل دانش‌آموزان الزامی است"],
      min: [0, "تعداد دانش‌آموزان نمی‌تواند منفی باشد"],
    },
    classifiedStudents: {
      type: Number,
      required: [true, "تعداد دانش‌آموزان کلاس‌بندی شده الزامی است"],
      min: [0, "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند منفی باشد"],
    },
    totalClasses: {
      type: Number,
      required: [true, "تعداد کلاس‌ها الزامی است"],
      min: [0, "تعداد کلاس‌ها نمی‌تواند منفی باشد"],
    },
    femaleStudents: {
      type: Number,
      required: [true, "تعداد دانش‌آموزان دختر الزامی است"],
      min: [0, "تعداد دانش‌آموزان دختر نمی‌تواند منفی باشد"],
    },
    maleStudents: {
      type: Number,
      required: [true, "تعداد دانش‌آموزان پسر الزامی است"],
      min: [0, "تعداد دانش‌آموزان پسر نمی‌تواند منفی باشد"],
    },
    provinceCode: {
      type: String,
      required: [true, "کد استان الزامی است"],
      trim: true,
      validate: {
        validator: async function (code) {
          const Province = mongoose.model("Province");
          const province = await Province.findOne({ code: code });
          return province !== null;
        },
        message: "کد استان معتبر نیست",
      },
    },
    districtCode: {
      type: String,
      required: [true, "کد منطقه الزامی است"],
      trim: true,
      validate: {
        validator: async function (code) {
          const District = mongoose.model("District");
          const district = await District.findOne({ code: code });
          return district !== null;
        },
        message: "کد منطقه معتبر نیست",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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

// ایجاد ایندکس ترکیبی برای جلوگیری از تکرار آمار در یک سال تحصیلی برای یک واحد سازمانی
examCenterStatsSchema.index(
  { organizationalUnitCode: 1, academicYear: 1 },
  { unique: true }
);

// میدل‌ور برای اعتبارسنجی منطقی داده‌ها
examCenterStatsSchema.pre("save", function (next) {
  const errors = [];

  // بررسی اینکه تعداد دانش‌آموزان کلاس‌بندی شده از کل دانش‌آموزان بیشتر نباشد
  if (this.classifiedStudents > this.totalStudents) {
    errors.push(
      "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد"
    );
  }

  // بررسی اینکه تعداد دانش‌آموزان دختر از کل دانش‌آموزان بیشتر نباشد
  if (this.femaleStudents > this.totalStudents) {
    errors.push(
      "تعداد دانش‌آموزان دختر نمی‌تواند از کل دانش‌آموزان بیشتر باشد"
    );
  }

  // بررسی اینکه تعداد دانش‌آموزان پسر از کل دانش‌آموزان بیشتر نباشد
  if (this.maleStudents > this.totalStudents) {
    errors.push("تعداد دانش‌آموزان پسر نمی‌تواند از کل دانش‌آموزان بیشتر باشد");
  }

  // بررسی اینکه مجموع دانش‌آموزان دختر و پسر برابر با کل دانش‌آموزان باشد
  if (this.maleStudents + this.femaleStudents !== this.totalStudents) {
    errors.push(
      "مجموع دانش‌آموزان دختر و پسر باید برابر با کل دانش‌آموزان باشد"
    );
  }

  if (errors.length > 0) {
    next(new Error(errors.join(", ")));
  } else {
    next();
  }
});

// میدل‌ور برای اعتبارسنجی در زمان به‌روزرسانی
examCenterStatsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // اگر فیلدهای مرتبط در حال به‌روزرسانی هستند، اعتبارسنجی انجام دهیم
  if (
    update.totalStudents !== undefined ||
    update.classifiedStudents !== undefined ||
    update.femaleStudents !== undefined ||
    update.maleStudents !== undefined
  ) {
    // اعتبارسنجی را در middleware بعدی انجام خواهیم داد
    this.setOptions({ runValidators: true });
  }

  next();
});

// متد استاتیک برای دریافت آمار یک واحد سازمانی در سال تحصیلی خاص
examCenterStatsSchema.statics.findByCodeAndYear = async function (code, year) {
  return this.findOne({
    organizationalUnitCode: code,
    academicYear: year,
    isActive: true,
  }).exec();
};

// متد استاتیک برای به‌روزرسانی یا ایجاد آمار
examCenterStatsSchema.statics.upsertStats = async function (stats, userId) {
  const { organizationalUnitCode, academicYear } = stats;

  const existingStats = await this.findOne({
    organizationalUnitCode,
    academicYear,
  });

  if (existingStats) {
    return this.findOneAndUpdate(
      { organizationalUnitCode, academicYear },
      {
        ...stats,
        updatedBy: userId,
      },
      { new: true, runValidators: true }
    );
  }

  return this.create({
    ...stats,
    createdBy: userId,
  });
};

const ExamCenterStats =
  mongoose.models?.ExamCenterStats ||
  mongoose.model("ExamCenterStats", examCenterStatsSchema);

export default ExamCenterStats;
