import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  expTime: {
    type: Number,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // اتوماتیک بعد از 10 دقیقه حذف می‌شود
  },
});

const OtpModel = mongoose.models?.Otp || mongoose.model("Otp", OtpSchema);

export default OtpModel;
