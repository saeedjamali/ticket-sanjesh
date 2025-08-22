import mongoose from "mongoose";

console.log("Initializing ProfileCorrectionRequest model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading ProfileCorrectionRequest model"
  );
}

const ProfileCorrectionRequestSchema = new mongoose.Schema({
  // اطلاعات کاربر درخواست کننده
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

  // اطلاعات مکانی
  provinceCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{2}$/.test(v); // دقیقاً 2 رقم
      },
      message: "کد استان باید دقیقاً 2 رقم باشد",
    },
  },
  districtCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{4}$/.test(v); // دقیقاً 4 رقم
      },
      message: "کد منطقه باید دقیقاً 4 رقم باشد",
    },
  },

  // فیلد مورد اعتراض
  disputedField: {
    type: String,
    required: true,
    enum: [
      "firstName", // نام
      "lastName", // نام خانوادگی
      "personnelCode", // کد پرسنلی
      "nationalId", // کد ملی
      "gender", // جنسیت
      "mobile", // شماره همراه
      "employmentType", // نوع استخدام
      "employmentField", // رشته استخدامی
      "fieldCode", // کد رشته
      "effectiveYears", // سنوات مؤثر
      "approvedScore", // امتیاز تایید شده
      "requestedTransferType", // نوع انتقال تقاضا
      "currentWorkPlaceCode", // کد محل خدمت
      "sourceDistrictCode", // کد مبدا
      "other", // سایر
    ],
  },

  // توضیحات اعتراض
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000,
  },

  // تصویر پیوست
  attachmentImage: {
    type: String, // URL تصویر
    required: false,
  },

  // وضعیت درخواست
  status: {
    type: String,
    enum: [
      "pending", // در انتظار بررسی
      "under_review", // در حال بررسی
      "approved", // تایید شده
      "rejected", // رد شده
      "cancelled", // لغو شده
    ],
    default: "pending",
  },

  // پاسخ کارشناس
  expertResponse: {
    type: String,
    trim: true,
    maxlength: 1000,
  },

  // تاریخ پاسخ کارشناس
  respondedAt: {
    type: Date,
  },

  // کارشناس پاسخ دهنده
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // تاریخ ایجاد
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // تاریخ به‌روزرسانی
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
ProfileCorrectionRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
ProfileCorrectionRequestSchema.index({ nationalId: 1 });
ProfileCorrectionRequestSchema.index({ provinceCode: 1, districtCode: 1 });
ProfileCorrectionRequestSchema.index({ status: 1 });
ProfileCorrectionRequestSchema.index({ createdAt: -1 });

// Check if model exists already to prevent overwrite during hot reload
const ProfileCorrectionRequestModel =
  mongoose.models?.ProfileCorrectionRequest ||
  mongoose.model("ProfileCorrectionRequest", ProfileCorrectionRequestSchema);

export default ProfileCorrectionRequestModel;
