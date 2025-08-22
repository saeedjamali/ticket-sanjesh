import mongoose from "mongoose";

console.log("Initializing AppealRequest model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading AppealRequest model"
  );
}

const AppealRequestSchema = new mongoose.Schema({
  // اطلاعات کاربر
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  nationalId: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  personnelCode: {
    type: String,
    required: false,
    trim: true,
  },

  // کدهای مکانی کاربر
  districtCode: {
    type: String,
    required: false,
    trim: true,
  },
  provinceCode: {
    type: String,
    required: false,
    trim: true,
  },

  // سال تحصیلی درخواست
  academicYear: {
    type: String,
    required: true,
    trim: true,
  },

  // دلایل انتخاب شده
  selectedReasons: [
    {
      reasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransferReason",
        required: true,
      },
      reasonCode: {
        type: String,
        required: true,
        trim: true,
      },
      reasonTitle: {
        type: String,
        required: true,
        trim: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
    },
  ],

  // مدارک بارگذاری شده برای هر دلیل
  uploadedDocuments: {
    type: Map,
    of: [
      {
        fileName: String,
        originalName: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: new Map(),
  },

  // اطلاعات زوج فرهنگی (در صورت وجود)
  culturalCoupleInfo: {
    personnelCode: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (value) {
          // اگر مقدار وجود دارد، باید 8 رقمی باشد
          if (value && value.length !== 8) {
            return false;
          }
          return true;
        },
        message: "کد پرسنلی همسر باید 8 رقمی باشد",
      },
    },
    districtCode: {
      type: String,
      required: false,
      trim: true,
    },
    districtName: {
      type: String,
      required: false,
      trim: true,
    },
    // نظر منطقه خدمت همسر (اختیاری)
    spouseDistrictOpinion: {
      type: String,
      required: false,
      trim: true,
    },
    // توضیح منطقه خدمت همسر (اختیاری)
    spouseDistrictDescription: {
      type: String,
      required: false,
      trim: true,
    },
    // تصمیم منطقه خدمت همسر (تایید/رد)
    spouseDistrictDecision: {
      type: String,
      enum: ["approve", "reject"],
      required: false,
    },
  },

  // هشدارهای سنوات
  yearsWarnings: [
    {
      reasonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransferReason",
      },
      userYears: Number,
      requiredYears: Number,
      message: String,
    },
  ],

  // وضعیت درخواست
  status: {
    type: String,
    enum: [
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "cancelled",
    ],
    default: "draft",
    required: true,
  },

  // مرحله فعلی
  currentStep: {
    type: Number,
    default: 3,
    min: 1,
    max: 6,
  },

  // تاریخ ارسال نهایی
  submittedAt: {
    type: Date,
    required: false,
  },

  // یادداشت‌های اضافی
  notes: {
    type: String,
    trim: true,
  },

  // اطلاعات بررسی
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  reviewedAt: {
    type: Date,
    required: false,
  },
  reviewNotes: {
    type: String,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
AppealRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
AppealRequestSchema.index({ userId: 1 });
AppealRequestSchema.index({ nationalId: 1 });
AppealRequestSchema.index({ status: 1 });
AppealRequestSchema.index({ createdAt: -1 });
AppealRequestSchema.index({ submittedAt: -1 });

// Check if model exists already to prevent overwrite during hot reload
const AppealRequestModel =
  mongoose.models?.AppealRequest ||
  mongoose.model("AppealRequest", AppealRequestSchema);

export default AppealRequestModel;
