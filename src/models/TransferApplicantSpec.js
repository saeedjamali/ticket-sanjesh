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
    required: false, // الزامی نیست
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
  requestStatus: {
    type: String,
    enum: [
      "awaiting_user_approval", // در انتظار تایید کاربر
      "source_review", // در حال بررسی مبدا
      "exception_eligibility_approval", // تایید مشمولیت استثنا
      "source_approval", // تایید مبدا
      "source_rejection", // رد مبدا
      "province_review", // در حال بررسی توسط استان
      "province_approval", // تایید استان
      "province_rejection", // رد استان
      "destination_review", // در حال بررسی مقصد
      "destination_approval", // تایید مقصد
      "destination_rejection", // رد مقصد
    ],
    required: true,
    default: "awaiting_user_approval",
  },

  // کمیسیون پزشکی
  medicalCommissionCode: {
    type: Number,
    enum: [1, 11, 2, 3, 4, 5],
    required: false,
  },
  medicalCommissionVerdict: {
    type: String,
    required: false,
    trim: true,
  },

  // مقصد نهایی
  finalDestination: finalDestinationSchema,

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
TransferApplicantSpecSchema.index({ requestStatus: 1 });
TransferApplicantSpecSchema.index({ sourceDistrictCode: 1 });
TransferApplicantSpecSchema.index({ currentWorkPlaceCode: 1 });
TransferApplicantSpecSchema.index({ isActive: 1 });

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
  const statusToCheck = status || this.requestStatus;
  const statusMap = {
    awaiting_user_approval: "در انتظار تایید کاربر",
    source_review: "در حال بررسی مبدا",
    exception_eligibility_approval: "تایید مشمولیت استثنا",
    source_approval: "تایید مبدا",
    source_rejection: "رد مبدا",
    province_review: "در حال بررسی توسط استان",
    province_approval: "تایید استان",
    province_rejection: "رد استان",
    destination_review: "در حال بررسی مقصد",
    destination_approval: "تایید مقصد",
    destination_rejection: "رد مقصد",
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
      3: "انتقال به شهرستان های مرکز قطب بصورت موقت ضرورت دارد",
      4: "انتقال ضرورت ندارد لکن قابل مساعدت است",
      5: "متقاضی واجد شرایط رای موثر برای انتقال نیست",
    };
    return verdictMap[this.medicalCommissionCode] || "تعیین نشده";
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

const TransferApplicantSpecModel =
  mongoose.models?.TransferApplicantSpec ||
  mongoose.model("TransferApplicantSpec", TransferApplicantSpecSchema);

export default TransferApplicantSpecModel;
