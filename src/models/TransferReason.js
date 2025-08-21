import mongoose from "mongoose";

console.log("Initializing TransferReason model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading TransferReason model"
  );
}

const TransferReasonSchema = new mongoose.Schema({
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
  requiresAdminApproval: {
    type: Boolean,
    default: false,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  requiresDocumentUpload: {
    type: Boolean,
    default: false,
    required: true,
  },
  requiredDocumentsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  hasYearsLimit: {
    type: Boolean,
    default: false,
    required: true,
  },
  yearsLimit: {
    type: Number,
    default: null,
    min: 0,
    validate: {
      validator: function (value) {
        // اگر hasYearsLimit فعال است، yearsLimit باید مقدار داشته باشد
        if (this.hasYearsLimit && (value === null || value === undefined)) {
          return false;
        }
        return true;
      },
      message: "در صورت فعال بودن محدودیت سنوات، مقدار سنوات ضروری است",
    },
  },
  isCulturalCouple: {
    type: Boolean,
    default: false,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
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
TransferReasonSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
TransferReasonSchema.index({ code: 1 });
TransferReasonSchema.index({ order: 1 });
TransferReasonSchema.index({ isActive: 1 });

// Check if model exists already to prevent overwrite during hot reload
const TransferReasonModel =
  mongoose.models?.TransferReason ||
  mongoose.model("TransferReason", TransferReasonSchema);

export default TransferReasonModel;
