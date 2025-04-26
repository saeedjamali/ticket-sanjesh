"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ROLES } from "@/lib/permissions";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [examCenters, setExamCenters] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    nationalId: "",
    password: "",
    role: "",
    province: "",
    district: "",
    examCenter: "",
  });

  // تعریف نقش‌های قابل انتخاب
  const availableRoles = [
    { value: ROLES.ADMIN, label: "مدیر سیستم" },
    { value: ROLES.SUPER_ADMIN, label: "مدیر کل" },
    { value: ROLES.PROVINCE_EDUCATION_EXPERT, label: "کارشناس آموزش استان" },
    { value: ROLES.PROVINCE_TECH_EXPERT, label: "کارشناس فناوری استان" },
    { value: ROLES.DISTRICT_EDUCATION_EXPERT, label: "کارشناس آموزش منطقه" },
    { value: ROLES.DISTRICT_TECH_EXPERT, label: "کارشناس فناوری منطقه" },
    { value: ROLES.EXAM_CENTER_MANAGER, label: "مدیر مرکز آزمون" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // دریافت استان‌ها
        const provincesResponse = await fetch("/api/provinces", {
          credentials: "include",
          cache: "no-store",
        });
        const provincesData = await provincesResponse.json();
        if (provincesData.success) {
          setProvinces(provincesData.provinces);
        }

        // دریافت مناطق
        const districtsResponse = await fetch("/api/districts", {
          credentials: "include",
          cache: "no-store",
        });
        const districtsData = await districtsResponse.json();
        if (districtsData.success) {
          setDistricts(districtsData.districts);
        }

        // دریافت مراکز آزمون
        const examCentersResponse = await fetch("/api/exam-centers", {
          credentials: "include",
          cache: "no-store",
        });
        const examCentersData = await examCentersResponse.json();
        if (examCentersData.success) {
          setExamCenters(examCentersData.examCenters);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("خطا در دریافت اطلاعات");
      }
    };

    fetchData();
  }, []);

  // تعیین فیلدهای اضافی بر اساس نقش
  const showProvinceField = [
    ROLES.SUPER_ADMIN, // مدیر کل
    ROLES.PROVINCE_EDUCATION_EXPERT, // کارشناس آموزش استان
    ROLES.PROVINCE_TECH_EXPERT, // کارشناس فناوری استان
    ROLES.DISTRICT_EDUCATION_EXPERT, // کارشناس آموزش منطقه
    ROLES.DISTRICT_TECH_EXPERT, // کارشناس فناوری منطقه
    ROLES.EXAM_CENTER_MANAGER, // مدیر مرکز آزمون
  ].includes(formData.role);

  const showDistrictField = [
    ROLES.DISTRICT_EDUCATION_EXPERT, // کارشناس آموزش منطقه
    ROLES.DISTRICT_TECH_EXPERT, // کارشناس فناوری منطقه
    ROLES.EXAM_CENTER_MANAGER, // مدیر مرکز آزمون
  ].includes(formData.role);

  const showExamCenterField = [
    ROLES.EXAM_CENTER_MANAGER, // مدیر مرکز آزمون
  ].includes(formData.role);

  // پاک کردن فیلدهای غیر مرتبط هنگام تغییر نقش
  useEffect(() => {
    setFormData((prev) => {
      const newData = { ...prev };

      // اگر نقش انتخاب شده نیاز به استان ندارد
      if (!showProvinceField) {
        newData.province = "";
        newData.district = "";
        newData.examCenter = "";
      }
      // اگر نقش انتخاب شده نیاز به منطقه ندارد
      else if (!showDistrictField) {
        newData.district = "";
        newData.examCenter = "";
      }
      // اگر نقش انتخاب شده نیاز به مرکز آزمون ندارد
      else if (!showExamCenterField) {
        newData.examCenter = "";
      }

      return newData;
    });
  }, [formData.role]);

  // اعتبارسنجی فرم قبل از ارسال
  const handleSubmit = async (e) => {
    e.preventDefault();

    // بررسی فیلدهای اجباری بر اساس نقش
    if (showProvinceField && !formData.province) {
      toast.error("لطفا استان را انتخاب کنید");
      return;
    }

    if (showDistrictField && !formData.district) {
      toast.error("لطفا منطقه را انتخاب کنید");
      return;
    }

    if (showExamCenterField && !formData.examCenter) {
      toast.error("لطفا مرکز آزمون را انتخاب کنید");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success("کاربر جدید با موفقیت ایجاد شد");
      router.push("/dashboard/users");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.message || "خطا در ایجاد کاربر جدید");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">افزودن کاربر جدید</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نام و نام خانوادگی */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* کد ملی */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              کد ملی
            </label>
            <input
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* رمز عبور */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* نقش */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نقش
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            >
              <option value="">انتخاب نقش</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* استان */}
          {showProvinceField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                استان
              </label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">انتخاب استان</option>
                {provinces.map((province) => (
                  <option key={province._id} value={province._id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* منطقه */}
          {showDistrictField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                منطقه
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">انتخاب منطقه</option>
                {districts
                  .filter(
                    (district) =>
                      !formData.province ||
                      district.province === formData.province
                  )
                  .map((district) => (
                    <option key={district._id} value={district._id}>
                      {district.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* مرکز آزمون */}
          {showExamCenterField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مرکز آزمون
              </label>
              <select
                name="examCenter"
                value={formData.examCenter}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">انتخاب مرکز آزمون</option>
                {examCenters
                  .filter(
                    (center) =>
                      (!formData.province ||
                        center.province === formData.province) &&
                      (!formData.district ||
                        center.district === formData.district)
                  )
                  .map((center) => (
                    <option key={center._id} value={center._id}>
                      {center.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* دکمه‌های عملیات */}
          <div className="flex justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? "در حال ثبت..." : "ثبت کاربر"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
