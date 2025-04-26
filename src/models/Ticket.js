import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ["high", "medium", "low"], // آنی، فوری، عادی
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "new", "seen", "inProgress", "resolved"], // پیش‌نویس، دیده نشده، دیده شده، در حال بررسی، پاسخ داده شده
    default: "new",
  },
  receiver: {
    type: String,
    enum: ["education", "tech"], // سنجش منطقه یا فناوری منطقه
    required: true,
  },
  type: {
    type: String,
    enum: ["EDUCATION", "TECH", "UNKNOWN"],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  examCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExamCenter",
    required: true,
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
    required: true,
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Province",
    required: true,
  },
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  academicYear: {
    type: String,
    required: true,
  },
  responses: [
    {
      text: {
        type: String,
        required: true,
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// تابع ایجاد شماره پیگیری منحصر به فرد
const generateTicketNumber = async () => {
  // ایجاد یک شماره 8 رقمی تصادفی
  const generateRandomNumber = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  let ticketNumber;
  let isUnique = false;

  // تلاش برای ایجاد شماره منحصر به فرد
  while (!isUnique) {
    ticketNumber = generateRandomNumber();

    // بررسی منحصر به فرد بودن شماره در دیتابیس
    const existingTicket = await mongoose.models.Ticket.findOne({
      ticketNumber,
    });

    if (!existingTicket) {
      isUnique = true;
    }
  }

  return ticketNumber;
};

// قبل از ذخیره تیکت، شماره پیگیری ایجاد شود
TicketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = await generateTicketNumber();
  }

  // تنظیم خودکار فیلد type بر اساس receiver اگر تنظیم نشده باشد
  if (!this.type) {
    if (this.receiver === "education") {
      this.type = "EDUCATION";
    } else if (this.receiver === "tech") {
      this.type = "TECH";
    } else {
      this.type = "UNKNOWN";
    }
  }

  next();
});

TicketSchema.index({ createdAt: -1 });
TicketSchema.index({ district: 1, status: 1 });
TicketSchema.index({ province: 1, status: 1 });

export default mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
