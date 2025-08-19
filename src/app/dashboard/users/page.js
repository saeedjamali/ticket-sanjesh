"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserContext } from "@/context/UserContext";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [examCenters, setExamCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { ROLES } = require("@/lib/permissions");
  const { user: currentUser } = useUserContext();

  // Load data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch users
      const usersResponse = await fetch("/api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      console.log("usersResponse--->", usersResponse);
      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        if (usersResponse.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error(errorData.error || "خطا در دریافت اطلاعات کاربران");
      }

      const usersData = await usersResponse.json();
      if (!usersData.success) {
        throw new Error(usersData.error || "خطا در دریافت اطلاعات کاربران");
      }

      setUsers(usersData.users || []);

      // Fetch provinces
      const provincesResponse = await fetch("/api/provinces", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!provincesResponse.ok) {
        const errorData = await provincesResponse.json();
        if (provincesResponse.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error(errorData.error || "خطا در دریافت اطلاعات استان‌ها");
      }

      const provincesData = await provincesResponse.json();
      if (!provincesData.success) {
        throw new Error(
          provincesData.error || "خطا در دریافت اطلاعات استان‌ها"
        );
      }

      setProvinces(provincesData.provinces || []);

      // Fetch districts
      const districtsResponse = await fetch("/api/districts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!districtsResponse.ok) {
        const errorData = await districtsResponse.json();
        if (districtsResponse.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error(errorData.error || "خطا در دریافت اطلاعات مناطق");
      }

      const districtsData = await districtsResponse.json();
      if (!districtsData.success) {
        throw new Error(districtsData.error || "خطا در دریافت اطلاعات مناطق");
      }

      setDistricts(districtsData.districts || []);

      // Fetch exam centers
      const examCentersResponse = await fetch("/api/exam-centers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!examCentersResponse.ok) {
        const errorData = await examCentersResponse.json();
        if (examCentersResponse.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error(
          errorData.error || "خطا در دریافت اطلاعات واحدهای سازمانی"
        );
      }

      const examCentersData = await examCentersResponse.json();
      if (!examCentersData.success) {
        throw new Error(
          examCentersData.error || "خطا در دریافت اطلاعات واحدهای سازمانی"
        );
      }

      setExamCenters(examCentersData.examCenters || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // فیلترهای جستجو
  const [searchFilters, setSearchFilters] = useState({
    searchText: "",
    role: "",
    isActive: "all",
    province: "",
    district: "",
    examCenter: "",
  });

  // حالت نمایش فرم‌ها
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  // اطلاعات کاربر جدید
  const [newUser, setNewUser] = useState({
    fullName: "",
    nationalId: "",
    password: "",
    confirmPassword: "",
    role: "",
    province: "",
    district: "",
    examCenter: "",
  });

  // اطلاعات کاربر در حال ویرایش
  const [editingUser, setEditingUser] = useState({
    id: "",
    fullName: "",
    nationalId: "",
    role: "",
    province: "",
    district: "",
    examCenter: "",
  });

  // اطلاعات تغییر رمز عبور
  const [passwordChange, setPasswordChange] = useState({
    userId: "",
    userFullName: "",
    newPassword: "",
    confirmPassword: "",
  });

  // فیلتر کردن مناطق بر اساس استان انتخاب شده
  const filteredDistricts = (province) => {
    if (!province) return [];
    if (!Array.isArray(districts)) return [];

    console.log(`Filtering districts for province: ${province}`);
    console.log(`Total districts available: ${districts.length}`);

    const filtered = districts.filter((district) => {
      // Check if district.province is an object or string
      const match =
        district.province && typeof district.province === "object"
          ? district.province._id === province
          : district.province === province;

      return match;
    });

    console.log(`Filtered districts count: ${filtered.length}`);
    return filtered;
  };

  // فیلتر کردن واحدهای سازمانی بر اساس منطقه انتخاب شده
  const filteredExamCenters = (province, district) => {
  
    if (!province || !district) return [];
    if (!Array.isArray(examCenters)) return [];

    console.log(
      `Filtering exam centers for province: ${province} and district: ${district}`
    );
    console.log(`Total exam centers available: ${examCenters.length}`);

    const filtered = examCenters.filter((center) => {
      const provinceMatch =
        center.province && typeof center.province === "object"
          ? center.province._id === province
          : center.province === province;

      const districtMatch =
        center.district && typeof center.district === "object"
          ? center.district._id === district
          : center.district === district;

      console.log("districtMatch--->", districtMatch);
      return districtMatch;
    });

    console.log(`Filtered exam centers count: ${filtered.length}`);
    return filtered;
  };

  // تابع نمایش نام نقش
  const getRoleName = (role) => {
    const roleMap = {
      systemAdmin: "مدیر سیستم",
      generalManager: "مدیر کل",
      provinceEducationExpert: "کارشناس سنجش استان",
      provinceTechExpert: "کارشناس فناوری استان",
      provinceEvalExpert: "کارشناس ارزیابی استان",
      provinceRegistrationExpert: "کارشناس ثبت نام استان",
      districtEducationExpert: "کارشناس سنجش منطقه",
      districtTechExpert: "کارشناس فناوری منطقه",
      districtEvalExpert: "کارشناس ارزیابی منطقه",
      districtRegistrationExpert: "کارشناس ثبت نام منطقه",
      examCenterManager: "مدیر واحد سازمانی",
    };

    return roleMap[role] || role;
  };

  // تغییر مقادیر فیلترهای جستجو
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters((prev) => ({ ...prev, [name]: value }));

    // اگر استان تغییر کرد، باید منطقه و واحد سازمانی را ریست کنیم
    if (name === "province") {
      setSearchFilters((prev) => ({ ...prev, district: "", examCenter: "" }));
    }

    // اگر منطقه تغییر کرد، باید واحد سازمانی را ریست کنیم
    if (name === "district") {
      setSearchFilters((prev) => ({ ...prev, examCenter: "" }));
    }
  };

  // اعمال فیلترها روی لیست کاربران
  const filteredUsers = users.filter((user) => {
    // فیلتر متن جستجو
    if (searchFilters.searchText) {
      const searchLower = searchFilters.searchText.toLowerCase();
      if (
        !user.fullName?.toLowerCase().includes(searchLower) &&
        !user.nationalId.includes(searchFilters.searchText)
      ) {
        return false;
      }
    }

    // فیلتر نقش
    if (searchFilters.role && user.role !== searchFilters.role) {
      return false;
    }

    // فیلتر وضعیت فعال بودن
    if (searchFilters.isActive !== "all") {
      const isActiveFilter = searchFilters.isActive === "active";
      if (user.isActive !== isActiveFilter) {
        return false;
      }
    }

    // فیلتر استان
    if (searchFilters.province && user.province !== searchFilters.province) {
      return false;
    }

    // فیلتر منطقه
    if (searchFilters.district && user.district !== searchFilters.district) {
      return false;
    }

    // فیلتر واحد سازمانی
    if (
      searchFilters.examCenter &&
      user.examCenter !== searchFilters.examCenter
    ) {
      return false;
    }

    return true;
  });

  // تغییر ورودی‌های فرم‌ها
  const handleInputChange = (form, e) => {
    const { name, value } = e.target;

    if (form === "add") {
      setNewUser((prev) => ({ ...prev, [name]: value }));

      // مدیریت فیلدهای وابسته
      if (name === "role") {
        // ریست کردن فیلدهای مرتبط با نقش
        const resetFields = { province: "", district: "", examCenter: "" };
        setNewUser((prev) => ({ ...prev, ...resetFields }));
      } else if (name === "province") {
        // ریست کردن منطقه و واحد سازمانی
        setNewUser((prev) => ({ ...prev, district: "", examCenter: "" }));

        // اگر استان انتخاب شده باشد، مناطق وابسته را دریافت کنیم
        if (value) {
          // لاگ برای بررسی
          console.log("فرم اضافه کردن: دریافت مناطق برای استان", value);

          // دریافت مناطق وابسته به استان
          fetch(`/api/districts?province=${value}`)
            .then((response) => {
              if (!response.ok) {
                throw new Error("خطا در دریافت مناطق");
              }
              return response.json();
            })
            .then((data) => {
              console.log("درخواست مناطق استان انجام شد. پاسخ:", data);

              // بررسی ساختار پاسخ
              if (data.districts && Array.isArray(data.districts)) {
                // ساختار جدید - districts در یک شیء است
                console.log(`مناطق دریافت شده: ${data.districts.length}`);
                setDistricts(data.districts);
              } else if (Array.isArray(data)) {
                // ساختار قدیمی - آرایه مستقیم
                console.log(`مناطق دریافت شده (ساختار قدیمی): ${data.length}`);
                setDistricts(data);
              } else {
                console.error("ساختار داده نامعتبر است:", data);
                setDistricts([]);
              }
            })
            .catch((error) => {
              console.error("خطا در دریافت مناطق:", error);
            });
        }
      } else if (name === "district") {
        // ریست کردن واحد سازمانی
        setNewUser((prev) => ({ ...prev, examCenter: "" }));

        // اگر منطقه انتخاب شده باشد، واحدهای سازمانی وابسته را دریافت کنیم
        if (value && newUser.province) {
          // لاگ برای بررسی
          console.log(
            "فرم اضافه کردن: دریافت واحدهای سازمانی برای منطقه",
            value
          );

          // دریافت واحدهای سازمانی وابسته به منطقه
          fetch(`/api/exam-centers?district=${value}`)
            .then((response) => {
              if (!response.ok) {
                throw new Error("خطا در دریافت واحدهای سازمانی");
              }
              return response.json();
            })
            .then((data) => {
              console.log("درخواست واحدهای سازمانی انجام شد. پاسخ:", data);

              // بررسی ساختار پاسخ
              if (data.examCenters && Array.isArray(data.examCenters)) {
                // ساختار جدید - examCenters در یک شیء است
                console.log(
                  `واحدهای سازمانی دریافت شده: ${data.examCenters.length}`
                );
                setExamCenters(data.examCenters);
              } else if (Array.isArray(data)) {
                // ساختار قدیمی - آرایه مستقیم
                console.log(
                  `واحدهای سازمانی دریافت شده (ساختار قدیمی): ${data.length}`
                );
                setExamCenters(data);
              } else {
                console.error("ساختار داده واحدهای سازمانی نامعتبر است:", data);
                setExamCenters([]);
              }
            })
            .catch((error) => {
              console.error("خطا در دریافت واحدهای سازمانی:", error);
            });
        }
      }
    } else if (form === "edit") {
      setEditingUser((prev) => ({ ...prev, [name]: value }));

      // مدیریت فیلدهای وابسته
      if (name === "role") {
        // ریست کردن فیلدهای مرتبط با نقش
        const resetFields = { province: "", district: "", examCenter: "" };
        setEditingUser((prev) => ({ ...prev, ...resetFields }));
      } else if (name === "province") {
        // ریست کردن منطقه و واحد سازمانی
        setEditingUser((prev) => ({ ...prev, district: "", examCenter: "" }));

        // اگر استان انتخاب شده باشد، مناطق وابسته را دریافت کنیم
        if (value) {
          // لاگ برای بررسی
          console.log("فرم ویرایش: دریافت مناطق برای استان", value);

          // دریافت مناطق وابسته به استان
          fetch(`/api/districts?province=${value}`)
            .then((response) => {
              if (!response.ok) {
                throw new Error("خطا در دریافت مناطق");
              }
              return response.json();
            })
            .then((data) => {
              console.log("درخواست مناطق استان انجام شد. پاسخ:", data);

              // بررسی ساختار پاسخ
              if (data.districts && Array.isArray(data.districts)) {
                // ساختار جدید - districts در یک شیء است
                console.log(`مناطق دریافت شده: ${data.districts.length}`);
                setDistricts(data.districts);
              } else if (Array.isArray(data)) {
                // ساختار قدیمی - آرایه مستقیم
                console.log(`مناطق دریافت شده (ساختار قدیمی): ${data.length}`);
                setDistricts(data);
              } else {
                console.error("ساختار داده نامعتبر است:", data);
                setDistricts([]);
              }
            })
            .catch((error) => {
              console.error("خطا در دریافت مناطق:", error);
            });
        }
      } else if (name === "district") {
        // ریست کردن واحد سازمانی
        setEditingUser((prev) => ({ ...prev, examCenter: "" }));

        // اگر منطقه انتخاب شده باشد، واحدهای سازمانی وابسته را دریافت کنیم
        if (value && editingUser.province) {
          // لاگ برای بررسی
          console.log("فرم ویرایش: دریافت واحدهای سازمانی برای منطقه", value);

          // دریافت واحدهای سازمانی وابسته به منطقه
          fetch(`/api/exam-centers?district=${value}`)
            .then((response) => {
              if (!response.ok) {
                throw new Error("خطا در دریافت واحدهای سازمانی");
              }
              return response.json();
            })
            .then((data) => {
              console.log("درخواست واحدهای سازمانی انجام شد. پاسخ:", data);

              // بررسی ساختار پاسخ
              if (data.examCenters && Array.isArray(data.examCenters)) {
                // ساختار جدید - examCenters در یک شیء است
                console.log(
                  `واحدهای سازمانی دریافت شده: ${data.examCenters.length}`
                );
                setExamCenters(data.examCenters);
              } else if (Array.isArray(data)) {
                // ساختار قدیمی - آرایه مستقیم
                console.log(
                  `واحدهای سازمانی دریافت شده (ساختار قدیمی): ${data.length}`
                );
                setExamCenters(data);
              } else {
                console.error("ساختار داده واحدهای سازمانی نامعتبر است:", data);
                setExamCenters([]);
              }
            })
            .catch((error) => {
              console.error("خطا در دریافت واحدهای سازمانی:", error);
            });
        }
      }
    } else if (form === "password") {
      setPasswordChange((prev) => ({ ...prev, [name]: value }));
    }
  };

  // نمایش فرم افزودن کاربر
  const handleShowAddForm = () => {
    setShowAddUserForm(true);
    setShowEditUserForm(false);
    setShowChangePasswordForm(false);

    // ریست کردن فرم
    setNewUser({
      fullName: "",
      nationalId: "",
      password: "",
      confirmPassword: "",
      role: "",
      province: "",
      district: "",
      examCenter: "",
    });
  };

  // نمایش فرم ویرایش کاربر
  const handleShowEditForm = (user) => {
    // if (
    //   currentUser.role === ROLES.DISTRICT_TECH_EXPERT ||
    //   currentUser.role === ROLES.DISTRICT_EDUCATION_EXPERT
    // ) {
    //   alert("شما دسترسی ویرایش کاربر را ندارید");
    //   return;
    // }
    setShowEditUserForm(true);
    setShowAddUserForm(false);
    setShowChangePasswordForm(false);

    console.log("Opening edit form for user:", user);

    // تنظیم مقادیر فرم ویرایش
    setEditingUser({
      id: user._id,
      fullName: user.fullName,
      nationalId: user.nationalId,
      role: user.role,
      province: user.province,
      district: user.district,
      examCenter: user.examCenter,
    });
  };

  // نمایش فرم تغییر رمز عبور
  const handleShowChangePasswordForm = (user) => {
    setShowChangePasswordForm(true);
    setShowAddUserForm(false);
    setShowEditUserForm(false);

    console.log("Opening change password form for user:", user);

    // تنظیم مقادیر فرم تغییر رمز
    setPasswordChange({
      userId: user._id,
      userFullName: user.fullName,
      newPassword: "",
      confirmPassword: "",
    });
  };

  // بستن همه فرم‌ها
  const handleCloseAllForms = () => {
    setShowAddUserForm(false);
    setShowEditUserForm(false);
    setShowChangePasswordForm(false);
  };

  // افزودن کاربر جدید
  const handleAddUser = async (e) => {
    e.preventDefault();

    // اعتبارسنجی فرم
    if (
      !newUser.fullName.trim() ||
      !newUser.nationalId.trim() ||
      !newUser.role
    ) {
      alert("لطفاً فیلدهای اجباری را تکمیل کنید");
      return;
    }

    // بررسی رمز عبور
    if (!newUser.password || newUser.password.length < 6) {
      alert("رمز عبور باید حداقل 6 کاراکتر باشد");
      return;
    }

    // بررسی تکرار رمز عبور
    if (newUser.password !== newUser.confirmPassword) {
      alert("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    // بررسی فیلدهای وابسته به نقش
    const requiresProvince = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "districtEducationExpert",
      "districtTechExpert",
      "examCenterManager",
    ];
    const requiresDistrict = [
      "districtEducationExpert",
      "districtTechExpert",
      "examCenterManager",
    ];
    const requiresExamCenter = ["examCenterManager"];

    if (requiresProvince.includes(newUser.role) && !newUser.province) {
      alert("لطفاً استان را انتخاب کنید");
      return;
    }

    if (requiresDistrict.includes(newUser.role) && !newUser.district) {
      alert("لطفاً منطقه را انتخاب کنید");
      return;
    }

    if (requiresExamCenter.includes(newUser.role) && !newUser.examCenter) {
      alert("لطفاً واحد سازمانی را انتخاب کنید");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: newUser.fullName,
          nationalId: newUser.nationalId,
          password: newUser.password,
          role: newUser.role,
          province: newUser.province,
          district: newUser.district,
          examCenter: newUser.examCenter,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در ایجاد کاربر");
      }

      const newUserData = await response.json();

      // Add the new user to the local state
      setUsers([...users, newUserData]);
      handleCloseAllForms();
      alert("کاربر جدید با موفقیت ایجاد شد");
    } catch (error) {
      alert(error.message || "خطا در ایجاد کاربر");
    }
  };

  // ویرایش کاربر
  const handleEditUser = async (e) => {
    e.preventDefault();

    // اعتبارسنجی فرم
    if (
      !editingUser.fullName.trim() ||
      !editingUser.nationalId.trim() ||
      !editingUser.role
    ) {
      alert("لطفاً فیلدهای اجباری را تکمیل کنید");
      return;
    }

    // بررسی فیلدهای وابسته به نقش
    const requiresProvince = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "districtEducationExpert",
      "districtTechExpert",
      "districtEvalExpert",
      "provinceEvalExpert",
      "provinceRegistrationExpert",
      "districtRegistrationExpert",
      "examCenterManager",
    ];
    const requiresDistrict = [
      "districtEducationExpert",
      "districtTechExpert",
      "districtEvalExpert",
      "examCenterManager",
    ];
    const requiresExamCenter = ["examCenterManager"];

    if (requiresProvince.includes(editingUser.role) && !editingUser.province) {
      alert("لطفاً استان را انتخاب کنید");
      return;
    }

    if (requiresDistrict.includes(editingUser.role) && !editingUser.district) {
      alert("لطفاً منطقه را انتخاب کنید");
      return;
    }

    if (
      requiresExamCenter.includes(editingUser.role) &&
      !editingUser.examCenter
    ) {
      alert("لطفاً واحد سازمانی را انتخاب کنید");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingUser.id,
          fullName: editingUser.fullName,
          nationalId: editingUser.nationalId,
          role: editingUser.role,
          province: editingUser.province,
          district: editingUser.district,
          examCenter: editingUser.examCenter,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در ویرایش کاربر");
      }

      const updatedUserData = await response.json();

      // Update the user in the local state
      setUsers(
        users.map((user) =>
          user._id === updatedUserData._id ? updatedUserData : user
        )
      );
      handleCloseAllForms();
      alert("اطلاعات کاربر با موفقیت بروزرسانی شد");
    } catch (error) {
      alert(error.message || "خطا در ویرایش کاربر");
    }
  };

  // تغییر رمز عبور کاربر
  const handleChangePassword = async (e) => {
    e.preventDefault();

    console.log("Changing password for user:", passwordChange);

    // بررسی وجود آیدی کاربر
    if (!passwordChange.userId) {
      alert("شناسه کاربر مشخص نیست");
      return;
    }

    // اعتبارسنجی رمز عبور
    if (!passwordChange.newPassword || passwordChange.newPassword.length < 6) {
      alert("رمز عبور جدید باید حداقل 6 کاراکتر باشد");
      return;
    }

    // بررسی تکرار رمز عبور
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      alert("رمز عبور جدید و تکرار آن مطابقت ندارند");
      return;
    }

    try {
      console.log("Sending request to change password:", {
        id: passwordChange.userId,
        password: passwordChange.newPassword,
      });

      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: passwordChange.userId,
          password: passwordChange.newPassword,
        }),
      });
      console.log("response--->", response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Password change error:", errorData);
        throw new Error(errorData.error || "خطا در تغییر رمز عبور");
      }

      handleCloseAllForms();
      alert("رمز عبور کاربر با موفقیت تغییر یافت");
    } catch (error) {
      console.error("Error changing password:", error);
      alert(error.message || "خطا در تغییر رمز عبور");
    }
  };

  // تغییر وضعیت فعال بودن کاربر
  const handleToggleUserStatus = async (userId) => {
    // Find the user in the local state
    const targetUser = users.find((user) => user._id === userId);

    if (!targetUser) {
      alert("کاربر یافت نشد");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          isActive: !targetUser.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در تغییر وضعیت کاربر");
      }

      const updatedUserData = await response.json();

      // Update the user in the local state
      setUsers(
        users.map((user) =>
          user._id === updatedUserData._id ? updatedUserData : user
        )
      );

      const status = updatedUserData.isActive ? "فعال" : "غیرفعال";
      alert(`کاربر با موفقیت ${status} شد`);
    } catch (error) {
      alert(error.message || "خطا در تغییر وضعیت کاربر");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">مدیریت کاربران</h1>

      <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-blue-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">لیست کاربران</h2>
          {(currentUser.role === ROLES.SYSTEM_ADMIN ||
            currentUser.role === ROLES.GENERAL_MANAGER ||
            currentUser.role === ROLES.PROVINCE_TECH_EXPERT) && (
            <div className="flex gap-2">
              <Link
                href="/dashboard/users/import"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                افزودن گروهی کاربران
              </Link>
              <button
                onClick={handleShowAddForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                افزودن کاربر جدید
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-grow">
            <input
              type="text"
              name="searchText"
              value={searchFilters.searchText}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="جستجوی نام یا کد ملی"
            />
          </div>
          <div>
            <select
              name="role"
              value={searchFilters.role}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه نقش‌ها</option>
              <option value="systemAdmin">مدیر سیستم</option>
              <option value="generalManager">مدیر کل</option>
              <option value="provinceEducationExpert">
                کارشناس سنجش استان
              </option>
              <option value="provinceTechExpert">کارشناس فناوری استان</option>
              <option value="provinceEvalExpert">کارشناس ارزیابی استان</option>
              <option value="provinceRegistrationExpert">
                کارشناس ثبت نام استان
              </option>
              <option value="districtEducationExpert">
                کارشناس سنجش منطقه
              </option>
              <option value="districtTechExpert">کارشناس فناوری منطقه</option>
              <option value="districtEvalExpert">کارشناس ارزیابی منطقه</option>
              <option value="districtRegistrationExpert">
                کارشناس ثبت نام منطقه
              </option>
              <option value="examCenterManager">مدیر واحد سازمانی</option>
            </select>
          </div>
          <div>
            <select
              name="isActive"
              value={searchFilters.isActive}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>
          <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md">
            فیلتر
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  نام و نام خانوادگی
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  کد ملی
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  نقش
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  استان
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  منطقه
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  واحد سازمانی
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  وضعیت
                </th>
                <th
                  className="py-3 px-6 border-b text-center
                "
                >
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 border-b text-center">
                    {user.fullName}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    {user.nationalId}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    {getRoleName(user.role)}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    {user.province && typeof user.province === "object"
                      ? user.province.name
                      : Array.isArray(provinces)
                      ? provinces.find((p) => p._id === user.province)?.name ||
                        "-"
                      : "-"}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    {user.district && typeof user.district === "object"
                      ? user.district.name
                      : Array.isArray(districts)
                      ? districts.find((d) => d._id === user.district)?.name ||
                        "-"
                      : "-"}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    {user.examCenter && typeof user.examCenter === "object"
                      ? user.examCenter.name
                      : Array.isArray(examCenters)
                      ? examCenters.find((c) => c._id === user.examCenter)
                          ?.name || "-"
                      : "-"}
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="py-4 px-6 border-b text-center">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleShowEditForm(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="ویرایش"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleShowChangePasswordForm(user)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="تغییر رمز عبور"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user._id)}
                        className={`${
                          user.isActive
                            ? "text-red-600 hover:text-red-800"
                            : "text-green-600 hover:text-green-800"
                        }`}
                        title={user.isActive ? "غیرفعال کردن" : "فعال کردن"}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              user.isActive
                                ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            }
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            نمایش {filteredUsers.length} از {users.length} کاربر
          </p>
        </div>
      </div>

      {/* فرم افزودن کاربر جدید */}
      {showAddUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">افزودن کاربر جدید</h2>
              <button
                onClick={handleCloseAllForms}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نام و نام خانوادگی *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={newUser.fullName}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کد ملی *
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    value={newUser.nationalId}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رمز عبور *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={newUser.password}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تکرار رمز عبور *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={newUser.confirmPassword}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نقش *
                  </label>
                  <select
                    name="role"
                    value={newUser.role}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="systemAdmin">مدیر سیستم</option>
                    <option value="generalManager">مدیر کل</option>
                    <option value="provinceEducationExpert">
                      کارشناس سنجش استان
                    </option>
                    <option value="provinceTechExpert">
                      کارشناس فناوری استان
                    </option>
                    <option value="provinceEvalExpert">
                      کارشناس ارزیابی استان
                    </option>
                    <option value="provinceRegistrationExpert">
                      کارشناس ثبت نام استان
                    </option>
                    <option value="districtEducationExpert">
                      کارشناس سنجش منطقه
                    </option>
                    <option value="districtEvalExpert">
                      کارشناس ارزیابی منطقه
                    </option>
                    <option value="districtRegistrationExpert">
                      کارشناس ثبت نام منطقه
                    </option>
                    <option value="districtTechExpert">
                      کارشناس فناوری منطقه
                    </option>
                    <option value="examCenterManager">مدیر واحد سازمانی</option>
                  </select>
                </div>
              </div>

              {/* فیلدهای وابسته به نقش */}
              {[
                "generalManager",
                "provinceEducationExpert",
                "provinceTechExpert",
                "provinceEvalExpert",
                "provinceRegistrationExpert",
                "districtEducationExpert",
                "districtTechExpert",
                "districtEvalExpert",
                "districtRegistrationExpert",
                "examCenterManager",
              ].includes(newUser.role) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    استان *
                  </label>
                  <select
                    name="province"
                    value={newUser.province}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {Array.isArray(provinces) && provinces.length > 0 ? (
                      provinces.map((province) => (
                        <option key={province._id} value={province._id}>
                          {province.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>استانی موجود نیست</option>
                    )}
                  </select>
                </div>
              )}

              {[
                "districtEducationExpert",
                "districtTechExpert",
                "districtEvalExpert",
                "districtRegistrationExpert",
                "examCenterManager",
              ].includes(newUser.role) &&
                newUser.province && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      منطقه *
                    </label>
                    <select
                      name="district"
                      value={newUser.district}
                      onChange={(e) => handleInputChange("add", e)}
                      className="w-full px-4 py-2 border rounded-md"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      {filteredDistricts(newUser.province).map((district) => (
                        <option key={district._id} value={district._id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {newUser.role === "examCenterManager" && newUser.district && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    واحد سازمانی *
                  </label>
                  <select
                    name="examCenter"
                    value={newUser.examCenter}
                    onChange={(e) => handleInputChange("add", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {filteredExamCenters(
                      newUser.province,
                      newUser.district
                    ).map((center) => (
                      <option key={center._id} value={center._id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllForms}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ثبت کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* فرم ویرایش کاربر */}
      {showEditUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">ویرایش کاربر</h2>
              <button
                onClick={handleCloseAllForms}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نام و نام خانوادگی *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={editingUser.fullName}
                    onChange={(e) => handleInputChange("edit", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    کد ملی *
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    value={editingUser.nationalId}
                    onChange={(e) => handleInputChange("edit", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نقش *
                  </label>
                  <select
                    name="role"
                    value={editingUser.role}
                    onChange={(e) => handleInputChange("edit", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="systemAdmin">مدیر سیستم</option>
                    <option value="generalManager">مدیر کل</option>
                    <option value="provinceEducationExpert">
                      کارشناس سنجش استان
                    </option>
                    <option value="provinceTechExpert">
                      کارشناس فناوری استان
                    </option>
                    <option value="provinceEvalExpert">
                      کارشناس ارزیابی استان
                    </option>
                    <option value="provinceRegistrationExpert">
                      کارشناس ثبت نام استان
                    </option>
                    <option value="districtEducationExpert">
                      کارشناس سنجش منطقه
                    </option>
                    <option value="districtEvalExpert">
                      کارشناس ارزیابی منطقه
                    </option>
                    <option value="districtRegistrationExpert">
                      کارشناس ثبت نام منطقه
                    </option>
                    <option value="districtTechExpert">
                      کارشناس فناوری منطقه
                    </option>
                    <option value="examCenterManager">مدیر واحد سازمانی</option>
                  </select>
                </div>
              </div>

              {/* فیلدهای وابسته به نقش */}
              {[
                "generalManager",
                "provinceEducationExpert",
                "provinceTechExpert",
                "districtEducationExpert",
                "districtTechExpert",
                "districtEvalExpert",
                "provinceEvalExpert",
                "provinceRegistrationExpert",
                "districtRegistrationExpert",
                "examCenterManager",
              ].includes(editingUser.role) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    استان *
                  </label>
                  <select
                    name="province"
                    value={editingUser.province}
                    onChange={(e) => handleInputChange("edit", e)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {Array.isArray(provinces) && provinces.length > 0 ? (
                      provinces.map((province) => (
                        <option key={province._id} value={province._id}>
                          {province.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>استانی موجود نیست</option>
                    )}
                  </select>
                </div>
              )}

              {[
                "districtEducationExpert",
                "districtTechExpert",
                "districtEvalExpert",
                "districtRegistrationExpert",
                "examCenterManager",
              ].includes(editingUser.role) &&
                editingUser.province && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      منطقه *
                    </label>
                    <select
                      name="district"
                      value={editingUser.district}
                      onChange={(e) => handleInputChange("edit", e)}
                      className="w-full px-4 py-2 border rounded-md"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      {filteredDistricts(editingUser.province).map(
                        (district) => (
                          <option key={district._id} value={district._id}>
                            {district.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

              {editingUser.role === "examCenterManager" &&
                editingUser.district && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      واحد سازمانی *
                    </label>
                    <select
                      name="examCenter"
                      value={editingUser.examCenter}
                      onChange={(e) => handleInputChange("edit", e)}
                      className="w-full px-4 py-2 border rounded-md"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      {filteredExamCenters(
                        editingUser.province,
                        editingUser.district
                      ).map((center) => (
                        <option key={center._id} value={center._id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div className="flex justify-end space-x-2 space-x-reverse pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleCloseAllForms}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* فرم تغییر رمز عبور */}
      {showChangePasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">تغییر رمز عبور کاربر</h2>
              <button
                onClick={handleCloseAllForms}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-gray-600">
              در حال تغییر رمز عبور برای:{" "}
              <span className="font-semibold">
                {passwordChange.userFullName}
              </span>
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رمز عبور جدید *
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordChange.newPassword}
                  onChange={(e) => handleInputChange("password", e)}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تکرار رمز عبور جدید *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordChange.confirmPassword}
                  onChange={(e) => handleInputChange("password", e)}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllForms}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  تغییر رمز عبور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
