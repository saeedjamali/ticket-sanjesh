const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

// MongoDB Connection URI
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ticket-system";

// Schema definitions for standalone execution
const AcademicYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

const ProvinceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  academicYear: {
    type: String,
    required: true,
  },
});

const DistrictSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Province",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  academicYear: {
    type: String,
    required: true,
  },
});

// Define models
const AcademicYear =
  mongoose.models?.AcademicYear ||
  mongoose.model("AcademicYear", AcademicYearSchema);
const Province =
  mongoose.models?.Province || mongoose.model("Province", ProvinceSchema);
const District =
  mongoose.models?.District || mongoose.model("District", DistrictSchema);
const User =
  mongoose.models?.User ||
  mongoose.model(
    "User",
    mongoose.Schema({
      nationalId: { type: String, required: true, unique: true, trim: true },
      role: { type: String, required: true },
    })
  );

// Sample data for initialization
const sampleProvinces = [
  { name: "تهران", code: "01" },
  { name: "اصفهان", code: "02" },
  { name: "شیراز", code: "03" },
  { name: "مشهد", code: "04" },
  { name: "تبریز", code: "05" },
];

const sampleDistricts = [
  { name: "منطقه ۱ تهران", code: "0101", provinceName: "تهران" },
  { name: "منطقه ۲ تهران", code: "0102", provinceName: "تهران" },
  { name: "منطقه ۱ اصفهان", code: "0201", provinceName: "اصفهان" },
  { name: "منطقه ۲ اصفهان", code: "0202", provinceName: "اصفهان" },
  { name: "منطقه ۱ شیراز", code: "0301", provinceName: "شیراز" },
];

async function initializeDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully!");

    // Get Admin User
    const adminUser = await User.findOne({ role: "systemAdmin" });
    if (!adminUser) {
      console.log("No admin user found! Please run init-db first.");
      process.exit(1);
    }

    // Initialize Academic Year
    let academicYear = await AcademicYear.findOne({});
    if (!academicYear) {
      console.log("No academic year found, creating default...");
      academicYear = await AcademicYear.create({
        year: "1402-1403",
        isActive: true,
        createdBy: adminUser._id,
      });
      console.log("Created default academic year:", academicYear.year);
    } else {
      console.log("Using existing academic year:", academicYear.year);
    }

    // Initialize Provinces
    const provinceCount = await Province.countDocuments();
    if (provinceCount === 0) {
      console.log("No provinces found, creating sample provinces...");

      for (const province of sampleProvinces) {
        // Check if province exists by name
        const existingProvince = await Province.findOne({
          name: province.name,
        });
        if (!existingProvince) {
          await Province.create({
            name: province.name,
            code: province.code,
            academicYear: academicYear.year,
          });
          console.log(`Created province: ${province.name}`);
        } else {
          console.log(`Province ${province.name} already exists, skipping...`);
        }
      }
      console.log(`Created ${sampleProvinces.length} sample provinces`);
    } else {
      console.log(`Found ${provinceCount} existing provinces`);
    }

    // Initialize Districts
    const districtCount = await District.countDocuments();
    if (districtCount === 0) {
      console.log("No districts found, creating sample districts...");

      for (const district of sampleDistricts) {
        const province = await Province.findOne({
          name: district.provinceName,
        });

        if (province) {
          // Check if district exists by name and province
          const existingDistrict = await District.findOne({
            name: district.name,
            province: province._id,
          });

          if (!existingDistrict) {
            await District.create({
              name: district.name,
              code: district.code,
              province: province._id,
              academicYear: academicYear.year,
            });
            console.log(
              `Created district: ${district.name} in ${district.provinceName}`
            );
          } else {
            console.log(
              `District ${district.name} already exists in ${district.provinceName}, skipping...`
            );
          }
        } else {
          console.log(
            `Province ${district.provinceName} not found, cannot create district ${district.name}`
          );
        }
      }
      console.log(`Created sample districts`);
    } else {
      console.log(`Found ${districtCount} existing districts`);
    }

    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Execute the initialization
initializeDatabase();
