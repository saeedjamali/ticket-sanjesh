import mongoose from "mongoose";

const correctionRequestSchema = new mongoose.Schema(
  {
    // اطلاعات درخواست
    currentStudentCount: {
      type: Number,
      required: [true, "تعداد دانش‌آموز فعلی الزامی است"],
      min: [0, "تعداد دانش‌آموز نمی‌تواند منفی باشد"],
    },
    correctedStudentCount: {
      type: Number,
      required: [true, "تعداد دانش‌آموز صحیح الزامی است"],
      min: [0, "تعداد دانش‌آموز نمی‌تواند منفی باشد"],
    },
    reason: {
      type: String,
      required: [true, "توضیح درخواست الزامی است"],
      trim: true,
      minLength: [10, "توضیح باید حداقل 10 کاراکتر باشد"],
    },

    // اطلاعات سازمانی
    examCenterCode: {
      type: String,
      required: [true, "کد واحد سازمانی الزامی است"],
      trim: true,
    },
    districtCode: {
      type: String,
      required: [true, "کد منطقه الزامی است"],
      trim: true,
    },
    provinceCode: {
      type: String,
      required: [true, "کد استان الزامی است"],
      trim: true,
    },

    // سال تحصیلی مربوطه
    academicYear: {
      type: String,
      required: [true, "سال تحصیلی الزامی است"],
      trim: true,
    },

    // اطلاعات درخواست کننده (مدیر واحد سازمانی)
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "درخواست کننده الزامی است"],
    },
    requestedByName: {
      type: String,
      required: [true, "نام درخواست کننده الزامی است"],
      trim: true,
    },
    requestedByPhone: {
      type: String,
      required: [true, "شماره همراه درخواست کننده الزامی است"],
      trim: true,
    },

    // وضعیت درخواست
    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "approved_district",
          "approved_province",
          "rejected",
        ],
        message: "وضعیت درخواست معتبر نیست",
      },
      default: "pending",
    },

    // پاسخ منطقه
    districtResponse: {
      type: String,
      trim: true,
    },
    districtReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    districtReviewedAt: {
      type: Date,
    },

    // پاسخ استان
    provinceResponse: {
      type: String,
      trim: true,
    },
    provinceReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    provinceReviewedAt: {
      type: Date,
    },

    // اطلاعات اضافی
    examCenterName: {
      type: String,
      required: [true, "نام واحد سازمانی الزامی است"],
      trim: true,
    },
    districtName: {
      type: String,
      required: [true, "نام منطقه الزامی است"],
      trim: true,
    },
    provinceName: {
      type: String,
      required: [true, "نام استان الزامی است"],
      trim: true,
    },

    // اطلاعات آمار اصلی از ExamCenterStats
    originalStatsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamCenterStats",
    },

    // آیا آمار اصلاح شده است؟
    isApplied: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
    },

    // حذف منطقی
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ایندکس‌ها برای بهبود عملکرد
correctionRequestSchema.index({ examCenterCode: 1, academicYear: 1 });
correctionRequestSchema.index({ districtCode: 1, status: 1 });
correctionRequestSchema.index({ provinceCode: 1, status: 1 });
correctionRequestSchema.index({ status: 1, createdAt: -1 });
correctionRequestSchema.index({ requestedBy: 1 });

// متد برای محاسبه تفاوت
correctionRequestSchema.methods.getDifference = function () {
  return this.correctedStudentCount - this.currentStudentCount;
};

// متد برای تعیین اینکه آیا درخواست قابل ویرایش است
correctionRequestSchema.methods.isEditable = function () {
  return this.status === "pending";
};

// متد برای تعیین اینکه آیا درخواست نیاز به تایید استان دارد
correctionRequestSchema.methods.needsProvinceApproval = function () {
  return this.status === "approved_district";
};

// متد استاتیک برای دریافت درخواست‌های یک منطقه
correctionRequestSchema.statics.getDistrictRequests = function (
  districtCode,
  status = null
) {
  const filter = { districtCode, isActive: true };
  if (status) filter.status = status;

  return this.find(filter)
    .populate("requestedBy", "fullName phone")
    .populate("districtReviewedBy", "fullName")
    .populate("provinceReviewedBy", "fullName")
    .sort({ createdAt: -1 });
};

// متد استاتیک برای دریافت درخواست‌های یک استان
correctionRequestSchema.statics.getProvinceRequests = function (
  provinceCode,
  status = null
) {
  const filter = { provinceCode, isActive: true };
  if (status) filter.status = status;

  return this.find(filter)
    .populate("requestedBy", "fullName phone")
    .populate("districtReviewedBy", "fullName")
    .populate("provinceReviewedBy", "fullName")
    .sort({ createdAt: -1 });
};

const CorrectionRequest =
  mongoose.models?.CorrectionRequest ||
  mongoose.model("CorrectionRequest", correctionRequestSchema);

export default CorrectionRequest;
