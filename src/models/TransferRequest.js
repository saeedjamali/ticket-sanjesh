import mongoose from "mongoose";

const transferRequestSchema = new mongoose.Schema(
  {
    // اطلاعات درخواست
    studentNationalId: {
      type: String,
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      index: true,
    },

    // اطلاعات مدرسه مبدا (درخواست کننده)
    fromSchool: {
      organizationalUnitCode: {
        type: String,
        required: true,
      },
      districtCode: {
        type: String,
        required: true,
      },
      schoolName: String,
      districtName: String,
      provinceName: String,
      provinceCode: String,
      managerName: String,
    },

    // اطلاعات مدرسه مقصد (دانش‌آموز فعلاً در آنجاست)
    toSchool: {
      organizationalUnitCode: {
        type: String,
        required: true,
      },
      districtCode: {
        type: String,
        required: true,
      },
      schoolName: String,
      districtName: String,
      provinceName: String,
      provinceCode: String,
    },

    // توضیحات مدیر مبدا
    requestDescription: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // وضعیت درخواست
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // پاسخ مدیر مقصد
    responseDescription: {
      type: String,
      maxlength: 1000,
    },

    // تاریخ‌ها
    requestDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseDate: {
      type: Date,
    },

    // اطلاعات دانش‌آموز (برای نمایش سریع)
    studentInfo: {
      firstName: String,
      lastName: String,
      fatherName: String,
      birthDate: String,
      gender: String,
      nationality: String,
      mobile: String,
      address: String,
      academicCourse: String,
      gradeCode: String,
      gradeName: String,
      fieldCode: String,
      fieldName: String,
      studentType: String,
      isActive: Boolean,
    },

    // شناسه کاربران
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ایندکس‌های ترکیبی
transferRequestSchema.index({
  studentNationalId: 1,
  academicYear: 1,
  status: 1,
});

transferRequestSchema.index({
  "toSchool.organizationalUnitCode": 1,
  status: 1,
  requestDate: -1,
});

transferRequestSchema.index({
  "fromSchool.organizationalUnitCode": 1,
  status: 1,
  requestDate: -1,
});

// متدهای مدل
transferRequestSchema.methods.approve = function (
  respondedBy,
  responseDescription = ""
) {
  this.status = "approved";
  this.respondedBy = respondedBy;
  this.responseDescription = responseDescription;
  this.responseDate = new Date();
  return this.save();
};

transferRequestSchema.methods.reject = function (
  respondedBy,
  responseDescription = ""
) {
  this.status = "rejected";
  this.respondedBy = respondedBy;
  this.responseDescription = responseDescription;
  this.responseDate = new Date();
  return this.save();
};

transferRequestSchema.statics.findPendingForSchool = function (
  organizationalUnitCode
) {
  return this.find({
    "toSchool.organizationalUnitCode": organizationalUnitCode,
    status: "pending",
  }).sort({ requestDate: -1 });
};

transferRequestSchema.statics.findBySchool = function (
  organizationalUnitCode,
  status = null
) {
  const query = {
    $or: [
      { "fromSchool.organizationalUnitCode": organizationalUnitCode },
      { "toSchool.organizationalUnitCode": organizationalUnitCode },
    ],
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ requestDate: -1 });
};

const TransferRequest =
  mongoose.models.TransferRequest ||
  mongoose.model("TransferRequest", transferRequestSchema);

export default TransferRequest;
