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

      // اطلاعات بررسی کارشناس برای این دلیل
      review: {
        // وضعیت بررسی: pending, approved, rejected
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },

        // کارشناس بررسی‌کننده
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
        },

        // زمان بررسی
        reviewedAt: {
          type: Date,
          required: false,
        },

        // توضیحات کارشناس برای این دلیل
        expertComment: {
          type: String,
          trim: true,
          required: false,
        },

        // نقش کارشناس بررسی‌کننده
        reviewerRole: {
          type: String,
          enum: ["districtTransferExpert", "provinceTransferExpert"],
          required: false,
        },

        // کد منطقه/استان کارشناس
        reviewerLocationCode: {
          type: String,
          trim: true,
          required: false,
        },

        // اطلاعات بیشتر (metadata)
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
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

  // توضیحات کاربر (مرحله 3 - فرم ثبت درخواست تجدید نظر)
  userComments: {
    type: String,
    trim: true,
    required: false,
  },

  // تصاویر توضیحات کاربر (حداکثر 2 تصویر)
  userCommentsImages: [
    {
      fileName: String,
      originalName: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // توضیحات کارشناس (مراحل بررسی)
  expertComments: {
    type: String,
    trim: true,
    required: false,
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

  // وضعیت کلی بررسی مستندات
  overallReviewStatus: {
    type: String,
    enum: ["pending", "in_review", "completed"],
    default: "pending",
  },

  // تایید/رد نهایی مشمولیت استثنا
  eligibilityDecision: {
    // تصمیم نهایی: approved, rejected
    decision: {
      type: String,
      enum: ["approved", "rejected"],
      required: false,
    },

    // کارشناس تصمیم‌گیرنده
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // زمان تصمیم‌گیری
    decidedAt: {
      type: Date,
      required: false,
    },

    // توضیحات تصمیم نهایی
    comment: {
      type: String,
      trim: true,
      required: false,
    },

    // نقش تصمیم‌گیرنده
    deciderRole: {
      type: String,
      enum: ["districtTransferExpert", "provinceTransferExpert"],
      required: false,
    },
  },

  // سیستم گفتگو بین کارشناس منطقه و متقاضی
  chatMessages: [
    {
      messageId: {
        type: String,
        required: true,
        default: () => new mongoose.Types.ObjectId().toString(),
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      senderRole: {
        type: String,
        enum: ["transferApplicant", "districtTransferExpert"],
        required: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
      },
      image: {
        type: String, // مسیر فایل تصویر
        required: false,
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
      isRead: {
        type: Boolean,
        default: false,
      },
    },
  ],

  // وضعیت گفتگو
  chatStatus: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },

  // آخرین پیام گفتگو
  lastChatActivity: {
    type: Date,
    default: null,
  },

  // کارشناس منطقه مسئول گفتگو
  chatAssignedExpert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
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
