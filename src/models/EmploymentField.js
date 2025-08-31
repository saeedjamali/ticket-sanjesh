import mongoose from "mongoose";

console.log("Initializing EmploymentField model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading EmploymentField model"
  );
}

const EmploymentFieldSchema = new mongoose.Schema({
  // کد رشته
  fieldCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d+$/.test(v); // فقط عدد
      },
      message: "کد رشته باید فقط شامل اعداد باشد",
    },
  },

  // عنوان رشته
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
  },

  // وضعیت فعال/غیرفعال
  isActive: {
    type: Boolean,
    default: true,
  },

  // توضیحات (اختیاری)
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  // مشترک (جنسیت مهم نیست)
  isShared: {
    type: Boolean,
    default: false,
    comment: "نشان‌دهنده این که در این رشته استخدامی، جنسیت مهم نیست",
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

  // کاربر ایجادکننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // کاربر آخرین ویرایش‌کننده
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

// Update the updatedAt field before saving
EmploymentFieldSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
EmploymentFieldSchema.index({ fieldCode: 1 });
EmploymentFieldSchema.index({ title: 1 });
EmploymentFieldSchema.index({ isActive: 1 });
EmploymentFieldSchema.index({ createdAt: -1 });

// Static methods
EmploymentFieldSchema.statics.findByCode = function (fieldCode) {
  return this.findOne({ fieldCode: fieldCode, isActive: true });
};

EmploymentFieldSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ title: 1 });
};

EmploymentFieldSchema.statics.search = function (searchTerm) {
  const regex = new RegExp(searchTerm, "i");
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { title: { $regex: regex } },
          { fieldCode: { $regex: regex } },
          { description: { $regex: regex } },
        ],
      },
    ],
  }).sort({ title: 1 });
};

// Instance methods
EmploymentFieldSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

EmploymentFieldSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Virtual for formatted display
EmploymentFieldSchema.virtual("displayName").get(function () {
  return `${this.fieldCode} - ${this.title}`;
});

// Ensure virtual fields are serialised
EmploymentFieldSchema.set("toJSON", {
  virtuals: true,
});

// Check if model exists already to prevent overwrite during hot reload
const EmploymentFieldModel =
  mongoose.models?.EmploymentField ||
  mongoose.model("EmploymentField", EmploymentFieldSchema);

export default EmploymentFieldModel;
