import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import User from "@/models/User";
import District from "@/models/District";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import * as XLSX from "xlsx";

export async function POST(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی
    if (
      ![ROLES.SYSTEM_ADMIN, ROLES.PROVINCE_TRANSFER_EXPERT].includes(
        userAuth.role
      )
    ) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // بررسی نوع فایل
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "فقط فایل‌های اکسل (.xlsx, .xls) مجاز هستند" },
        { status: 400 }
      );
    }

    // خواندن فایل اکسل
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json(
        { success: false, error: "فایل خالی است یا ساختار صحیحی ندارد" },
        { status: 400 }
      );
    }

    const results = {
      total: jsonData.length,
      success: 0,
      errors: [],
      created: [],
    };

    // پردازش هر سطر
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // شماره سطر در اکسل (شروع از سطر 2)

      try {
        // اعتبارسنجی فیلدهای ضروری
        const requiredFields = {
          firstName: row["نام"] || row["firstName"],
          lastName: row["نام خانوادگی"] || row["lastName"],
          personnelCode: row["کد پرسنلی"] || row["personnelCode"],
          employmentType: row["نوع استخدام"] || row["employmentType"],
          gender: row["جنسیت"] || row["gender"],
          mobile: row["تلفن همراه"] || row["mobile"],
          employmentField: row["رشته استخدامی"] || row["employmentField"],
          fieldCode: row["کد رشته"] || row["fieldCode"],
          requestedTransferType:
            row["نوع انتقال تقاضا"] || row["requestedTransferType"],
          currentWorkPlaceCode:
            row["کد محل خدمت"] || row["currentWorkPlaceCode"],
          sourceDistrictCode: row["کد مبدا"] || row["sourceDistrictCode"],
        };

        // فیلدهای اختیاری که می‌توانند 0 باشند
        const optionalFields = {
          effectiveYears: (() => {
            const value = row["سنوات مؤثر"] || row["effectiveYears"];
            if (value === null || value === undefined || value === "") return 0;
            const parsed = parseInt(value);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          approvedScore: (() => {
            const value = row["امتیاز تایید شده"] || row["approvedScore"];
            if (value === null || value === undefined || value === "") return 0;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          })(),
        };

        // بررسی فیلدهای ضروری
        const missingFields = [];
        Object.entries(requiredFields).forEach(([key, value]) => {
          if (!value || (typeof value === "string" && !value.trim())) {
            missingFields.push(key);
          }
        });

        if (missingFields.length > 0) {
          results.errors.push({
            row: rowNumber,
            error: `فیلدهای ضروری مفقود: ${missingFields.join(", ")}`,
            data: row,
          });
          continue;
        }

        // تبدیل مقادیر
        const transformValues = (value) => {
          if (typeof value === "string") {
            const lowerValue = value.toLowerCase().trim();

            // نوع استخدام
            if (["رسمی", "official"].includes(lowerValue)) return "official";
            if (["پیمانی", "contractual"].includes(lowerValue))
              return "contractual";
            if (["حق التدریس", "adjunct"].includes(lowerValue))
              return "adjunct";
            if (["قراردادی", "contract"].includes(lowerValue))
              return "contract";
            if (["آزمایشی", "trial"].includes(lowerValue)) return "trial";

            // جنسیت
            if (["مرد", "male", "m"].includes(lowerValue)) return "male";
            if (["زن", "female", "f"].includes(lowerValue)) return "female";

            // نوع انتقال
            if (["موقت", "temporary"].includes(lowerValue)) return "temporary";
            if (["دائم", "permanent"].includes(lowerValue)) return "permanent";
          }
          return value;
        };

        // تبدیل کدهای منطقه به آیدی
        const currentWorkPlaceDistrict = await District.findOne({
          code: requiredFields.currentWorkPlaceCode.toString().trim(),
        });
        const sourceDistrict = await District.findOne({
          code: requiredFields.sourceDistrictCode.toString().trim(),
        });

        if (!currentWorkPlaceDistrict) {
          results.errors.push({
            row: rowNumber,
            error: `منطقه با کد ${requiredFields.currentWorkPlaceCode} یافت نشد`,
            data: row,
          });
          continue;
        }

        if (!sourceDistrict) {
          results.errors.push({
            row: rowNumber,
            error: `منطقه مبدا با کد ${requiredFields.sourceDistrictCode} یافت نشد`,
            data: row,
          });
          continue;
        }

        // پردازش اولویت‌های مقصد
        const destinationPriorities = {};
        for (let i = 1; i <= 7; i++) {
          const priorityCode =
            row[`مقصد اولویت ${i}`] || row[`destinationPriority${i}`];
          if (priorityCode && priorityCode.toString().trim()) {
            const priorityDistrict = await District.findOne({
              code: priorityCode.toString().trim(),
            });
            if (priorityDistrict) {
              destinationPriorities[`destinationPriority${i}`] = {
                districtCode: priorityDistrict.code,
                transferType: "permanent_preferred", // مقدار پیش‌فرض
              };
            }
          }
        }

        // پردازش مقصد نهایی
        let finalDestination = null;
        const finalDestCode = row["مقصد نهایی"] || row["finalDestination"];
        if (finalDestCode && finalDestCode.toString().trim()) {
          const finalDistrict = await District.findOne({
            code: finalDestCode.toString().trim(),
          });
          if (finalDistrict) {
            finalDestination = {
              districtCode: finalDistrict.code,
              transferType: transformValues(
                row["نوع انتقال نهایی"] ||
                  row["finalDestinationType"] ||
                  "permanent"
              ),
            };
          }
        }

        const specData = {
          firstName: requiredFields.firstName.trim(),
          lastName: requiredFields.lastName.trim(),
          personnelCode: requiredFields.personnelCode.toString().trim(),
          nationalId: row["کد ملی"] || row["nationalId"] || "",
          employmentType: transformValues(requiredFields.employmentType),
          gender: transformValues(requiredFields.gender),
          mobile: requiredFields.mobile.toString().trim(),
          effectiveYears: optionalFields.effectiveYears,
          employmentField: requiredFields.employmentField.trim(),
          fieldCode: requiredFields.fieldCode.toString().trim(),
          approvedScore: optionalFields.approvedScore,
          requestedTransferType: transformValues(
            requiredFields.requestedTransferType
          ),
          currentWorkPlaceCode: currentWorkPlaceDistrict.code,
          sourceDistrictCode: sourceDistrict.code,
          // اولویت‌های مقصد
          ...destinationPriorities,
          // مقصد نهایی
          ...(finalDestination && { finalDestination }),
          currentTransferStatus:
            parseInt(
              row["وضعیت فعلی انتقال"] || row["currentTransferStatus"]
            ) || 1,
          requestStatus:
            row["وضعیت درخواست"] ||
            row["requestStatus"] ||
            "awaiting_user_approval",
          // فیلدهای جدید
          canEditDestination: (() => {
            const persianValue = row["امکان ویرایش مقصد"];
            const englishValue = row["canEditDestination"];

            // بررسی مقادیر فارسی
            if (
              persianValue === 1 ||
              persianValue === "1" ||
              persianValue === "بله" ||
              persianValue === true ||
              persianValue === "true"
            ) {
              return true;
            }
            if (
              persianValue === 0 ||
              persianValue === "0" ||
              persianValue === "خیر" ||
              persianValue === false ||
              persianValue === "false"
            ) {
              return false;
            }

            // بررسی مقادیر انگلیسی
            if (
              englishValue === true ||
              englishValue === "true" ||
              englishValue === "بله"
            ) {
              return true;
            }
            if (
              englishValue === false ||
              englishValue === "false" ||
              englishValue === "خیر"
            ) {
              return false;
            }

            // مقدار پیش‌فرض در صورت خالی بودن
            return true;
          })(),
          medicalCommissionCode:
            parseInt(
              row["کد رای کمیسیون پزشکی"] || row["medicalCommissionCode"]
            ) || "",
          medicalCommissionVerdict:
            row["رای کمیسیون پزشکی"] || row["medicalCommissionVerdict"] || "",
          isActive:
            row["وضعیت فعال"] === "بله" ||
            row["isActive"] === true ||
            row["وضعیت فعال"] === true ||
            true, // مقدار پیش‌فرض
          createdBy: userAuth.userId,
        };

        // اعتبارسنجی اضافی
        if (!/^\d{8}$/.test(specData.personnelCode)) {
          results.errors.push({
            row: rowNumber,
            error: "کد پرسنلی باید دقیقاً 8 رقم باشد",
            data: row,
          });
          continue;
        }

        if (specData.nationalId && !/^\d{8,10}$/.test(specData.nationalId)) {
          results.errors.push({
            row: rowNumber,
            error: "کد ملی باید بین 8 تا 10 رقم باشد",
            data: row,
          });
          continue;
        }

        if (!/^\d{11}$/.test(specData.mobile)) {
          results.errors.push({
            row: rowNumber,
            error: "شماره همراه باید دقیقاً 11 رقم باشد",
            data: row,
          });
          continue;
        }

        if (
          !["official", "contractual", "adjunct", "contract", "trial"].includes(
            specData.employmentType
          )
        ) {
          results.errors.push({
            row: rowNumber,
            error: "نوع استخدام نامعتبر",
            data: row,
          });
          continue;
        }

        if (!["male", "female"].includes(specData.gender)) {
          results.errors.push({
            row: rowNumber,
            error: "جنسیت نامعتبر",
            data: row,
          });
          continue;
        }

        if (
          !["temporary", "permanent"].includes(specData.requestedTransferType)
        ) {
          results.errors.push({
            row: rowNumber,
            error: "نوع انتقال تقاضا نامعتبر",
            data: row,
          });
          continue;
        }

        // بررسی تکراری بودن کد پرسنلی
        const existingSpec = await TransferApplicantSpec.findOne({
          personnelCode: specData.personnelCode,
        });

        if (existingSpec) {
          results.errors.push({
            row: rowNumber,
            error: "کد پرسنلی تکراری است",
            data: row,
          });
          continue;
        }

        // بررسی تکراری بودن کد ملی (در صورت وجود)
        if (specData.nationalId) {
          const existingNationalId = await TransferApplicantSpec.findOne({
            nationalId: specData.nationalId,
          });

          if (existingNationalId) {
            results.errors.push({
              row: rowNumber,
              error: "کد ملی تکراری است",
              data: row,
            });
            continue;
          }
        }

        // ایجاد مشخصات پرسنل
        const newSpec = new TransferApplicantSpec(specData);

        // اضافه کردن log اولیه ایجاد
        newSpec.addStatusLog({
          toStatus: newSpec.requestStatus || "awaiting_user_approval",
          actionType: "created",
          performedBy: userAuth.userId,
          comment: "ایجاد مشخصات پرسنل از طریق Excel",
          metadata: {
            personnelCode: newSpec.personnelCode,
            nationalId: newSpec.nationalId,
            uploadSource: "excel",
            rowNumber: rowNumber,
          },
        });

        await newSpec.save();

        results.success++;
        results.created.push({
          row: rowNumber,
          personnelCode: specData.personnelCode,
          name: `${specData.firstName} ${specData.lastName}`,
        });

        // ایجاد خودکار کاربر (در صورت وجود کد ملی)
        if (specData.nationalId) {
          try {
            const existingUser = await User.findOne({
              nationalId: specData.nationalId,
            });

            if (!existingUser) {
              const district = await District.findById(
                specData.currentWorkPlaceCode
              ).populate("province");

              const hashedPassword = await bcrypt.hash(specData.nationalId, 12);

              // دریافت کد استان از کاربر وارد شده
              let userProvinceId = userAuth.province;
              if (
                typeof userProvinceId === "string" &&
                mongoose.isValidObjectId(userProvinceId)
              ) {
                // اگر ObjectId است، همان را استفاده می‌کنیم
              } else if (typeof userProvinceId === "string") {
                // اگر کد است، آن را به ObjectId تبدیل می‌کنیم
                const Province = require("@/models/Province");
                const provinceDoc = await Province.findOne({
                  code: userProvinceId,
                }).select("_id");
                userProvinceId = provinceDoc?._id || userAuth.province;
              }

              const newUser = new User({
                nationalId: specData.nationalId,
                password: hashedPassword,
                fullName: `${specData.firstName} ${specData.lastName}`,
                role: ROLES.TRANSFER_APPLICANT,
                province: district?.province?._id || userProvinceId,
                district: district?._id || null,
                phone: specData.mobile,
                isActive: true,
              });

              await newUser.save();
            }
          } catch (userCreationError) {
            console.error(
              `Error creating user for row ${rowNumber}:`,
              userCreationError
            );
            // ادامه می‌دهیم حتی اگر ایجاد کاربر با خطا روبرو شود
          }
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error.message || "خطا در پردازش سطر",
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `پردازش کامل شد. ${results.success} مورد موفق، ${results.errors.length} مورد ناموفق`,
      results,
    });
  } catch (error) {
    console.error("Error in POST /api/transfer-applicant-specs/upload:", error);
    return NextResponse.json(
      { success: false, error: "خطا در بارگذاری فایل" },
      { status: 500 }
    );
  }
}
