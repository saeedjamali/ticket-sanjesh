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
    totalStudents: {
      type: Number,
      required: [true, "تعداد کل دانش‌آموزان الزامی است"],
      min: [0, "تعداد دانش‌آموزان نمی‌تواند منفی باشد"],
    },
    classifiedStudents: {
      type: Number,
      required: [true, "تعداد دانش‌آموزان کلاس‌بندی شده الزامی است"],
      min: [0, "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند منفی باشد"],
      validate: {
        validator: function (value) {
          return value <= this.totalStudents;
        },
        message:
          "تعداد دانش‌آموزان کلاس‌بندی شده نمی‌تواند از کل دانش‌آموزان بیشتر باشد",
      },
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
      validate: {
        validator: function (value) {
          return value <= this.totalStudents;
        },
        message:
          "تعداد دانش‌آموزان دختر نمی‌تواند از کل دانش‌آموزان بیشتر باشد",
      },
    },
    maleStudents: {
      type: Number,
      required: [true, "تعداد دانش‌آموزان پسر الزامی است"],
      min: [0, "تعداد دانش‌آموزان پسر نمی‌تواند منفی باشد"],
      validate: {
        validator: function (value) {
          return value <= this.totalStudents;
        },
        message: "تعداد دانش‌آموزان پسر نمی‌تواند از کل دانش‌آموزان بیشتر باشد",
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

// میدل‌ور برای اعتبارسنجی مجموع دانش‌آموزان دختر و پسر
examCenterStatsSchema.pre("save", function (next) {
  if (this.maleStudents + this.femaleStudents !== this.totalStudents) {
    next(
      new Error(
        "مجموع دانش‌آموزان دختر و پسر باید برابر با کل دانش‌آموزان باشد"
      )
    );
  } else {
    next();
  }
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
