import mongoose from "mongoose";

const clauseConditionSchema = new mongoose.Schema(
  {
    // شناسه منحصر به فرد
    conditionId: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return (
          "CC-" +
          Date.now() +
          "-" +
          Math.random().toString(36).substr(2, 5).toUpperCase()
        );
      },
    },

    // عنوان شرط
    title: {
      type: String,
      required: [true, "عنوان شرط الزامی است"],
      trim: true,
      maxlength: [200, "عنوان شرط نمی‌تواند بیش از 200 کاراکتر باشد"],
    },

    // شرح و توضیحات شرط
    description: {
      type: String,
      required: false, // اختیاری شد
      trim: true,
      maxlength: [1000, "شرح شرط نمی‌تواند بیش از 1000 کاراکتر باشد"],
    },

    // نوع شرط: موافقت یا مخالفت
    conditionType: {
      type: String,
      required: [true, "نوع شرط الزامی است"],
      enum: {
        values: ["approval", "rejection"],
        message: "نوع شرط باید یکی از مقادیر approval یا rejection باشد",
      },
    },

    // بندهای مرتبط (امکان تخصیص یک شرط به چند بند)
    relatedClauses: [
      {
        clauseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TransferReason",
          required: true,
        },
        // اولویت شرط برای این بند (اختیاری)
        priority: {
          type: Number,
          min: 1,
          max: 10,
          default: 5,
        },
      },
    ],

    // وضعیت فعال/غیرفعال
    isActive: {
      type: Boolean,
      default: true,
    },

    // سطح اهمیت شرط
    importanceLevel: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message:
          "سطح اهمیت باید یکی از مقادیر low, medium, high, critical باشد",
      },
      default: "medium",
    },

    // تاریخ اعتبار شرط (از چه زمانی معتبر است)
    validFrom: {
      type: Date,
      default: Date.now,
    },

    // تاریخ انقضای شرط (تا چه زمانی معتبر است)
    validUntil: {
      type: Date,
      default: null, // null به معنای بدون تاریخ انقضا
    },

    // اطلاعات ایجاد و بروزرسانی
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
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "clauseconditions",
  }
);

// ایندکس‌ها برای جستجوی بهینه
clauseConditionSchema.index({ conditionId: 1 });
clauseConditionSchema.index({ conditionType: 1 });
clauseConditionSchema.index({ isActive: 1 });
clauseConditionSchema.index({ "relatedClauses.clauseId": 1 });
clauseConditionSchema.index({ validFrom: 1, validUntil: 1 });

// Virtual برای نمایش نام کامل
clauseConditionSchema.virtual("displayName").get(function () {
  return `${
    this.title
  } (${this.conditionType === "approval" ? "موافقت" : "مخالفت"})`;
});

// Virtual برای بررسی معتبر بودن شرط در زمان فعلی
clauseConditionSchema.virtual("isCurrentlyValid").get(function () {
  const now = new Date();
  const validFrom = this.validFrom || new Date(0);
  const validUntil = this.validUntil || new Date("2099-12-31");

  return this.isActive && now >= validFrom && now <= validUntil;
});

// Pre-save middleware برای بروزرسانی updatedAt
clauseConditionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware برای اعتبارسنجی تاریخ‌ها
clauseConditionSchema.pre("save", function (next) {
  if (this.validUntil && this.validFrom && this.validUntil <= this.validFrom) {
    return next(new Error("تاریخ انقضا باید پس از تاریخ شروع اعتبار باشد"));
  }
  next();
});

// Static method برای یافتن شرایط فعال
clauseConditionSchema.statics.findActive = function () {
  return this.find({
    isActive: true,
    $or: [{ validUntil: null }, { validUntil: { $gte: new Date() } }],
    validFrom: { $lte: new Date() },
  });
};

// Static method برای یافتن شرایط بر اساس نوع
clauseConditionSchema.statics.findByType = function (conditionType) {
  return this.find({ conditionType, isActive: true }).populate(
    "relatedClauses.clauseId",
    "title clauseType isActive"
  );
};

// Static method برای یافتن شرایط مرتبط با یک بند خاص
clauseConditionSchema.statics.findByClause = function (clauseId) {
  return this.find({
    "relatedClauses.clauseId": clauseId,
    isActive: true,
  }).populate("relatedClauses.clauseId", "title clauseType");
};

// Static method برای جستجو
clauseConditionSchema.statics.search = function (searchTerm) {
  const regex = new RegExp(searchTerm, "i");
  return this.find({
    $or: [{ title: regex }, { description: regex }, { conditionId: regex }],
  }).populate("relatedClauses.clauseId", "title clauseType");
};

// Instance method برای اضافه کردن بند جدید
clauseConditionSchema.methods.addClause = function (clauseId, priority = 5) {
  // بررسی اینکه بند قبلاً اضافه نشده باشد
  const existingClause = this.relatedClauses.find(
    (clause) => clause.clauseId.toString() === clauseId.toString()
  );

  if (!existingClause) {
    this.relatedClauses.push({ clauseId, priority });
    return this.save();
  }

  return Promise.resolve(this);
};

// Instance method برای حذف بند
clauseConditionSchema.methods.removeClause = function (clauseId) {
  this.relatedClauses = this.relatedClauses.filter(
    (clause) => clause.clauseId.toString() !== clauseId.toString()
  );
  return this.save();
};

// Instance method برای غیرفعال کردن شرط
clauseConditionSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Instance method برای فعال کردن شرط
clauseConditionSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Ensure virtual fields are serialized
clauseConditionSchema.set("toJSON", { virtuals: true });

const ClauseCondition =
  mongoose.models.ClauseCondition ||
  mongoose.model("ClauseCondition", clauseConditionSchema);

export default ClauseCondition;
