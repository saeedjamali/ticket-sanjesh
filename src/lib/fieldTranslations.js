// ترجمه فیلدهای مورد اعتراض به فارسی
export const getFieldDisplayName = (fieldKey) => {
  const fieldTranslations = {
    firstName: "نام",
    lastName: "نام خانوادگی",
    personnelCode: "کد پرسنلی",
    nationalId: "کد ملی",
    gender: "جنسیت",
    mobile: "شماره همراه",
    employmentType: "نوع استخدام",
    employmentField: "رشته استخدامی",
    fieldCode: "کد رشته",
    effectiveYears: "سنوات مؤثر",
    approvedScore: "امتیاز تایید شده",
    requestedTransferType: "نوع انتقال تقاضا",
    currentWorkPlaceCode: "کد محل خدمت",
    sourceDistrictCode: "کد مبدا",
    other: "سایر",
  };

  return fieldTranslations[fieldKey] || fieldKey;
};

// لیست کامل فیلدها برای استفاده در فرم‌ها
export const getAllFields = () => {
  return [
    { value: "firstName", label: "نام" },
    { value: "lastName", label: "نام خانوادگی" },
    { value: "personnelCode", label: "کد پرسنلی" },
    { value: "nationalId", label: "کد ملی" },
    { value: "gender", label: "جنسیت" },
    { value: "mobile", label: "شماره همراه" },
    { value: "employmentType", label: "نوع استخدام" },
    { value: "employmentField", label: "رشته استخدامی" },
    { value: "fieldCode", label: "کد رشته" },
    { value: "effectiveYears", label: "سنوات مؤثر" },
    { value: "approvedScore", label: "امتیاز تایید شده" },
    { value: "requestedTransferType", label: "نوع انتقال تقاضا" },
    { value: "currentWorkPlaceCode", label: "کد محل خدمت" },
    { value: "sourceDistrictCode", label: "کد مبدا" },
    { value: "other", label: "سایر" },
  ];
};

export const getCustomFieldsForCorrection = () => {
  return [
    { value: "employmentField", label: "رشته استخدامی" },
    { value: "effectiveYears", label: "سنوات مؤثر" },
    { value: "approvedScore", label: "امتیاز تایید شده" },
  ];
};
