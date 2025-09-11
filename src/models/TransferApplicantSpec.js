import mongoose from "mongoose";

console.log("Initializing TransferApplicantSpec model");

if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading TransferApplicantSpec model"
  );
}

// آبجکت مقصد (شامل آیدی منطقه و نوع انتقال)
const destinationSchema = new mongoose.Schema(
  {
    districtCode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{4}$/.test(v); // دقیقاً 4 رقم
        },
        message: "کد منطقه مقصد باید دقیقاً 4 رقم باشد",
      },
    },
    transferType: {
      type: String,
      enum: [
        "permanent_preferred", // دائم یا موقت با اولویت دائم
        "permanent_only", // فقط دائم
        "temporary_only", // فقط موقت
      ],
      required: true,
    },
  },
  { _id: false }
);

// آبجکت مقصد نهایی (شامل آیدی منطقه و نوع انتقال نهایی)
const finalDestinationSchema = new mongoose.Schema(
  {
    districtCode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{4}$/.test(v); // دقیقاً 4 رقم
        },
        message: "کد منطقه مقصد نهایی باید دقیقاً 4 رقم باشد",
      },
    },
    transferType: {
      type: String,
      enum: ["permanent", "temporary"], // دائم یا موقت
      required: true,
    },
  },
  { _id: false }
);

// آبجکت لاگ تغییرات وضعیت
const statusLogSchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      required: false, // برای اولین بار خالی است
    },
    toStatus: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: [
        "created", // ایجاد
        "status_change", // تغییر وضعیت
        "approval", // تایید
        "rejection", // رد
        "review", // ارسال برای بررسی
        "updated", // بروزرسانی
        "activated", // فعال کردن
        "deactivated", // غیرفعال کردن
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    comment: {
      type: String,
      required: false,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // برای ذخیره اطلاعات اضافی
      required: false,
    },
  },
  { _id: true }
);

const TransferApplicantSpecSchema = new mongoose.Schema({
  // مشخصات فردی
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  personnelCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{8}$/.test(v); // دقیقاً 8 رقم
      },
      message: "کد پرسنلی باید دقیقاً 8 رقم باشد",
    },
  },
  nationalId: {
    type: String,
    required: true, // الزامی نیست
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^\d{8,10}$/.test(v); // 8 تا 10 رقم یا خالی
      },
      message: "کد ملی باید بین 8 تا 10 رقم باشد",
    },
  },

  // مشخصات شغلی
  employmentType: {
    type: String,
    enum: ["official", "contractual", "adjunct", "contract", "trial"], // رسمی، پیمانی، حق التدریس، قراردادی، آزمایشی
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female"], // مرد، زن
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{11}$/.test(v); // دقیقاً 11 رقم
      },
      message: "شماره همراه باید دقیقاً 11 رقم باشد",
    },
  },
  effectiveYears: {
    type: Number,
    required: true,
    min: 0,
  },
  employmentField: {
    type: String,
    required: true,
    trim: true,
  },
  fieldCode: {
    type: String,
    required: true,
    trim: true,
  },
  approvedScore: {
    type: Number,
    required: true,
    min: 0,
  },

  // نوع انتقال تقاضا
  requestedTransferType: {
    type: String,
    enum: ["temporary", "permanent"], // موقت، دائم
    required: true,
  },

  // نظر اداره مبدا درباره نوع انتقال
  sourceOpinionTransferType: {
    type: String,
    enum: ["permanent", "temporary"], // انتقال دائم، انتقال موقت
    required: false, // اختیاری
    trim: true,
  },

  // کدهای مکانی
  currentWorkPlaceCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{4}$/.test(v); // دقیقاً 4 رقم
      },
      message: "کد محل خدمت باید دقیقاً 4 رقم باشد",
    },
  },
  sourceDistrictCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{4}$/.test(v); // دقیقاً 4 رقم
      },
      message: "کد مبدا باید دقیقاً 4 رقم باشد",
    },
  },

  // اولویت‌های مقصد (1 تا 7)
  destinationPriority1: destinationSchema,
  destinationPriority2: destinationSchema,
  destinationPriority3: destinationSchema,
  destinationPriority4: destinationSchema,
  destinationPriority5: destinationSchema,
  destinationPriority6: destinationSchema,
  destinationPriority7: destinationSchema,

  // وضعیت‌ها
  currentTransferStatus: {
    type: Number,
    enum: [1, 2, 3, 4], // 1: منتقل نشده در پردازش، 2: منتقل شده پردازشی، 3: ثبت نام ناقص، 4: رد درخواست توسط منطقه مبدا
    required: true,
    default: 1,
  },
  // گردش کار وضعیت درخواست - آرایه‌ای از تغییرات وضعیت
  requestStatusWorkflow: [
    {
      status: {
        type: String,
        enum: [
          "user_no_action", // عدم اقدام کاربر
          "awaiting_user_approval", // در انتظار تایید کاربر
          "user_approval", // تایید کاربر
          "source_review", // در حال بررسی مبدا
          "exception_eligibility_approval", // تایید مشمولیت استثنا
          "exception_eligibility_rejection", // رد مشمولیت استثنا
          "source_approval", // تایید مبدا
          "source_rejection", // رد مبدا
          "province_review", // در حال بررسی توسط استان
          "province_approval", // تایید استان
          "province_rejection", // رد استان
          "destination_review", // در حال بررسی مقصد
          "destination_approval", // تایید مقصد
          "destination_rejection", // رد مقصد
          "temporary_transfer_approved", // موافقت با انتقال موقت
          "permanent_transfer_approved", // موافقت با انتقال دائم
          "invalid_request", // درخواست نامعتبر است
        ],
        required: true,
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      changedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      previousStatus: {
        type: String,
        enum: [
          "user_no_action",
          "awaiting_user_approval",
          "user_approval",
          "source_review",
          "exception_eligibility_approval",
          "exception_eligibility_rejection",
          "source_approval",
          "source_rejection",
          "province_review",
          "province_approval",
          "province_rejection",
          "destination_review",
          "destination_approval",
          "destination_rejection",
          "temporary_transfer_approved",
          "permanent_transfer_approved",
          "invalid_request",
        ],
        default: null,
      },
      reason: {
        type: String,
        trim: true,
        default: "",
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      userAgent: {
        type: String,
        trim: true,
        default: "",
      },
      ipAddress: {
        type: String,
        trim: true,
        default: "",
      },
    },
  ],

  // وضعیت فعلی درخواست (برای سهولت دسترسی و کوئری)
  currentRequestStatus: {
    type: String,
    enum: [
      "user_no_action",
      "awaiting_user_approval",
      "user_approval",
      "source_review",
      "exception_eligibility_approval",
      "exception_eligibility_rejection",
      "source_approval",
      "source_rejection",
      "province_review",
      "province_approval",
      "province_rejection",
      "destination_review",
      "destination_approval",
      "destination_rejection",
      "temporary_transfer_approved",
      "permanent_transfer_approved",
      "invalid_request",
    ],
    required: true,
    default: "user_no_action",
  },

  // کمیسیون پزشکی
  medicalCommissionCode: {
    type: Number,
    enum: [1, 11, 2, 22, 3, 33, 4, 5],
    required: false,
  },
  medicalCommissionVerdict: {
    type: String,
    required: false,
    trim: true,
  },

  // مقصد نهایی
  finalDestination: finalDestinationSchema,

  // فیلدهای اعلام نتایج انتقال
  // 1- وضعیت نتیجه نهایی
  finalResultStatus: {
    type: String,
    enum: [
      "conditions_not_met", // حالت1: شرایط مصوب دستورالعمل تجدیدنظر، توسط اداره مبدأ احراز نشده و لذا متقاضی فاقد شرایط انتقال تشخیص داده شد
      "source_disagreement", // حالت2: به دلیل کمبود نیروی انسانی، انتقال متقاضی مورد موافقت اداره مبدأ قرار نگرفت
      "temporary_transfer_approved", // حالت3: با انتقال متقاضی بصورت موقت یکساله موافقت شد
      "permanent_transfer_approved", // حالت4: با انتقال متقاضی بصورت دائم موافقت شد
      "under_review", // حالت5: پرونده متقاضی درحال بررسی است
      null, // حالت6: هیچ یک
    ],
    required: false,
    default: null,
  },

  // 2- کد منطقه مقصد انتقال (نهایی)
  finalTransferDestinationCode: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^\d{4}$/.test(v); // دقیقاً 4 رقم یا خالی
      },
      message: "کد منطقه مقصد انتقال باید دقیقاً 4 رقم باشد",
    },
  },

  // 3- علت موافقت یا مخالفت
  finalResultReason: {
    type: String,
    required: false,
    trim: true,
    maxlength: 1000, // حداکثر 1000 کاراکتر
  },

  // امکان ویرایش مقصد
  canEditDestination: {
    type: Boolean,
    default: true,
  },

  // فیلدهای سیستمی
  isActive: {
    type: Boolean,
    default: true,
  },

  // لاگ تغییرات وضعیت
  statusLog: {
    type: [statusLogSchema],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

// Pre-save hook برای به‌روزرسانی updatedAt
TransferApplicantSpecSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// اندکس‌ها
TransferApplicantSpecSchema.index({ personnelCode: 1 });
TransferApplicantSpecSchema.index({ nationalId: 1 });
TransferApplicantSpecSchema.index({ currentTransferStatus: 1 });
TransferApplicantSpecSchema.index({ currentRequestStatus: 1 }); // تغییر از requestStatus به currentRequestStatus
TransferApplicantSpecSchema.index({ sourceDistrictCode: 1 });
TransferApplicantSpecSchema.index({ currentWorkPlaceCode: 1 });
TransferApplicantSpecSchema.index({ isActive: 1 });
TransferApplicantSpecSchema.index({ "requestStatusWorkflow.status": 1 });
TransferApplicantSpecSchema.index({ "requestStatusWorkflow.changedAt": 1 });

// تابع helper برای دریافت متن وضعیت انتقال فعلی
TransferApplicantSpecSchema.methods.getCurrentTransferStatusText = function () {
  const statusMap = {
    1: "منتقل نشده در پردازش",
    2: "منتقل شده پردازشی",
    3: "ثبت نام ناقص",
    4: "رد درخواست توسط منطقه مبدا",
  };
  return statusMap[this.currentTransferStatus] || "نامشخص";
};

// تابع helper برای دریافت متن وضعیت درخواست
TransferApplicantSpecSchema.methods.getRequestStatusText = function (status) {
  const statusToCheck = status || this.currentRequestStatus;
  const statusMap = {
    user_no_action: "فاقد درخواست تجدیدنظر",
    awaiting_user_approval: "درخواست ناقص است",
    user_approval: "در انتظار بررسی مبدأ",
    source_review: "درحال بررسی مشمولیت",
    exception_eligibility_rejection: "فاقد شرایط (عدم احراز مشمولیت)",
    exception_eligibility_approval: "تایید مشمولیت، نظر مبدأ نامشخص",
    source_rejection: "مخالفت مبدا (عدم موافقت)",
    temporary_transfer_approved: "موافقت با انتقال موقت",
    permanent_transfer_approved: "موافقت با انتقال دائم",
    province_review: "درحال بررسی توسط اداره کل",
    invalid_request: "درخواست نامعتبر است",
  };
  return statusMap[statusToCheck] || "نامشخص";
};

// تابع helper برای دریافت متن رای کمیسیون پزشکی
TransferApplicantSpecSchema.methods.getMedicalCommissionVerdictText =
  function () {
    const verdictMap = {
      1: "انتقال به نزدیکترین محل مورد تقاضا بصورت دائم ضرورت دارد",
      11: "انتقال به نزدیکترین محل مورد تقاضا بصورت موقت ضرورت دارد",
      2: "انتقال به شهر مشهد (یکی از نواحی هفتگانه) بصورت موقت ضرورت دارد",
      22: "انتقال به شهر مشهد (یکی از نواحی هفتگانه) بصورت دائم ضرورت دارد",
      3: "انتقال به شهرستان های مرکز قطب بصورت موقت ضرورت دارد",
      33: "انتقال به شهرستان های مرکز قطب بصورت دائم ضرورت دارد.",
      4: "انتقال ضرورت ندارد لکن قابل مساعدت است",
      5: "متقاضی واجد شرایط رای موثر برای انتقال نیست",
    };
    return verdictMap[this.medicalCommissionCode] || "تعیین نشده";
  };

// تابع helper برای دریافت متن فارسی وضعیت نتیجه نهایی
TransferApplicantSpecSchema.methods.getFinalResultStatusText = function () {
  const statusMap = {
    conditions_not_met:
      "شرایط مصوب دستورالعمل تجدیدنظر، توسط اداره مبدأ احراز نشده و لذا متقاضی فاقد شرایط انتقال تشخیص داده شد",
    source_disagreement:
      "به دلیل کمبود نیروی انسانی، انتقال متقاضی مورد موافقت اداره مبدأ قرار نگرفت",
    temporary_transfer_approved: "با انتقال متقاضی بصورت موقت یکساله موافقت شد",
    permanent_transfer_approved: "با انتقال متقاضی بصورت دائم موافقت شد",
    under_review: "پرونده متقاضی درحال بررسی است",
  };
  return statusMap[this.finalResultStatus] || "تعیین نشده";
};

// تابع برای اضافه کردن log entry
TransferApplicantSpecSchema.methods.addStatusLog = function (logData) {
  const {
    fromStatus,
    toStatus,
    actionType,
    performedBy,
    comment = "",
    metadata = {},
  } = logData;

  const logEntry = {
    fromStatus: fromStatus || null,
    toStatus,
    actionType,
    performedBy,
    comment,
    metadata,
    performedAt: new Date(),
  };

  this.statusLog.push(logEntry);
  return this;
};

// تابع برای دریافت آخرین log entry
TransferApplicantSpecSchema.methods.getLatestLog = function () {
  if (this.statusLog.length === 0) return null;
  return this.statusLog[this.statusLog.length - 1];
};

// تابع برای دریافت timeline کامل
TransferApplicantSpecSchema.methods.getStatusTimeline = function () {
  return this.statusLog.sort(
    (a, b) => new Date(a.performedAt) - new Date(b.performedAt)
  );
};

// اضافه کردن متد برای تغییر وضعیت درخواست
TransferApplicantSpecSchema.methods.changeRequestStatus = function (
  statusData
) {
  const previousStatus = this.currentRequestStatus;
  const newStatus = statusData.status;

  // اضافه کردن به workflow
  this.requestStatusWorkflow.push({
    status: newStatus,
    changedBy: statusData.changedBy,
    changedAt: statusData.changedAt || new Date(),
    previousStatus: previousStatus,
    reason: statusData.reason || "",
    metadata: statusData.metadata || {},
    userAgent: statusData.userAgent || "",
    ipAddress: statusData.ipAddress || "",
  });

  // به‌روزرسانی وضعیت فعلی
  this.currentRequestStatus = newStatus;

  // اضافه کردن به statusLog برای سازگاری با سیستم قبلی
  this.addStatusLog({
    fromStatus: previousStatus,
    toStatus: newStatus,
    actionType: "status_change",
    performedBy: statusData.changedBy,
    comment:
      statusData.reason ||
      `تغییر وضعیت از ${this.getRequestStatusText(
        previousStatus
      )} به ${this.getRequestStatusText(newStatus)}`,
    metadata: {
      ...statusData.metadata,
      workflowChange: true,
    },
  });
};

// اضافه کردن متد برای دریافت آخرین وضعیت
TransferApplicantSpecSchema.methods.getLatestStatus = function () {
  if (this.requestStatusWorkflow.length === 0) {
    return {
      status: this.currentRequestStatus,
      changedAt: this.createdAt,
      changedBy: null,
    };
  }

  return this.requestStatusWorkflow[this.requestStatusWorkflow.length - 1];
};

// اضافه کردن متد برای دریافت تاریخچه وضعیت‌ها
TransferApplicantSpecSchema.methods.getStatusHistory = function () {
  return this.requestStatusWorkflow.sort(
    (a, b) => new Date(a.changedAt) - new Date(b.changedAt)
  );
};

const TransferApplicantSpecModel =
  mongoose.models?.TransferApplicantSpec ||
  mongoose.model("TransferApplicantSpec", TransferApplicantSpecSchema);

export default TransferApplicantSpecModel;
