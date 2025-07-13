import mongoose from "mongoose";

const dropoutReasonSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DropoutReason",
      default: null,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
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

// Index برای بهبود عملکرد
dropoutReasonSchema.index({ parent: 1, level: 1, order: 1 });
dropoutReasonSchema.index({ isActive: 1 });
dropoutReasonSchema.index({ code: 1 });

// Virtual برای دریافت فرزندان
dropoutReasonSchema.virtual("children", {
  ref: "DropoutReason",
  localField: "_id",
  foreignField: "parent",
});

// Pre-save middleware برای تنظیم سطح
dropoutReasonSchema.pre("save", async function (next) {
  if (this.parent) {
    const parentDoc = await this.model("DropoutReason").findById(this.parent);
    if (parentDoc) {
      this.level = parentDoc.level + 1;
    }
  } else {
    this.level = 1;
  }
  next();
});

// Pre-remove middleware برای حذف فرزندان
dropoutReasonSchema.pre("remove", async function (next) {
  await this.model("DropoutReason").deleteMany({ parent: this._id });
  next();
});

const DropoutReason =
  mongoose.models.DropoutReason ||
  mongoose.model("DropoutReason", dropoutReasonSchema);

export default DropoutReason;
