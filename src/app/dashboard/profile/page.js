"use client";

import { useUserContext } from "@/context/UserContext";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // افزودن متغیرهای مربوط به شماره موبایل
  const [phone, setPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const { user } = useUserContext();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/users/profile", {
          credentials: "include",
        });
        const data = await response.json();
        if (data.success) {
          setUserInfo(data.user);
          // قرار دادن شماره موبایل فعلی در حالت ویرایش
          if (data.user.phone) {
            setPhone(data.user.phone);
          }
          setLoading(false);
          // console.log("userInfo-------->", data);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  const getRoleName = (role) => {
    const roleMap = {
      systemAdmin: "مدیر سیستم",
      generalManager: "مدیر کل",
      provinceEducationExpert: "کارشناس سنجش استان",
      provinceTechExpert: "کارشناس فناوری استان",
      districtEducationExpert: "کارشناس سنجش منطقه",
      districtTechExpert: "کارشناس فناوری منطقه",
      examCenterManager: "مدیر واحد سازمانی",
      provinceRegistrationExpert: "کارشناس ثبت نام استان",
      districtRegistrationExpert: "کارشناس ثبت نام منطقه",
      transferApplicant: "کاربر متقاضی انتقال",
      districtTransferExpert: "کارشناس انتقال منطقه",
      provinceTransferExpert: "کارشناس انتقال استان",
      provinceEvalExpert: "کارشناس سنجش استان",
      districtEvalExpert: "کارشناس سنجش منطقه",
      provinceTechExpert: "کارشناس فناوری استان",
      districtTechExpert: "کارشناس فناوری منطقه",
      provinceRegistrationExpert: "کارشناس ثبت نام استان",
      districtRegistrationExpert: "کارشناس ثبت نام منطقه",
    };

    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const roleColorMap = {
      systemAdmin: "bg-purple-100 text-purple-800",
      generalManager: "bg-indigo-100 text-indigo-800",
      provinceEducationExpert: "bg-blue-100 text-blue-800",
      provinceTechExpert: "bg-cyan-100 text-cyan-800",
      districtEducationExpert: "bg-teal-100 text-teal-800",
      districtTechExpert: "bg-green-100 text-green-800",
      examCenterManager: "bg-amber-100 text-amber-800",
    };

    return roleColorMap[role] || "bg-gray-100 text-gray-800";
  };

  // تابع به‌روزرسانی شماره موبایل
  const handlePhoneUpdate = async () => {
    // بررسی اعتبار شماره موبایل
    if (!phone || !/^09\d{9}$/.test(phone)) {
      setPhoneError("لطفاً یک شماره موبایل معتبر وارد کنید");
      return;
    }

    setIsSendingCode(true);
    setPhoneError("");
    setPhoneSuccess("");

    try {
      const response = await fetch("/api/users/phone/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        setPhoneSuccess(data.message);
        setShowVerification(true);

        // ارسال درخواست پیامک کد تأیید
        await sendVerificationCode();
      } else {
        setPhoneError(data.message);
      }
    } catch (error) {
      setPhoneError("خطا در به‌روزرسانی شماره موبایل");
      console.error("Error updating phone:", error);
    } finally {
      setIsSendingCode(false);
    }
  };

  // تابع ارسال کد تأیید
  const sendVerificationCode = async () => {
    try {
      const response = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.status !== 200 && data.status !== 201) {
        setPhoneError("خطا در ارسال کد تأیید. لطفا دوباره تلاش کنید");
      }
    } catch (error) {
      console.error("Error sending verification code:", error);
      setPhoneError("خطا در ارسال کد تأیید. لطفا دوباره تلاش کنید");
    }
  };

  // تابع تأیید شماره موبایل
  const handleVerifyPhone = async () => {
    if (!verificationCode) {
      setPhoneError("لطفاً کد تأیید را وارد کنید");
      return;
    }

    setIsVerifying(true);
    setPhoneError("");

    try {
      const response = await fetch("/api/users/phone/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        setPhoneSuccess("شماره موبایل با موفقیت تأیید شد");
        setShowVerification(false);
        setIsEditingPhone(false);

        // به‌روزرسانی اطلاعات کاربر در localStorage
        try {
          // دریافت اطلاعات فعلی کاربر از localStorage
          const userFromStorage = JSON.parse(
            localStorage.getItem("user") || "{}"
          );

          // به‌روزرسانی phoneVerified در اطلاعات کاربر
          userFromStorage.phoneVerified = true;
          userFromStorage.phone = phone;

          // ذخیره مجدد اطلاعات کاربر در localStorage
          localStorage.setItem("user", JSON.stringify(userFromStorage));

          // نمایش پیام موفقیت
          toast.success("شماره موبایل شما با موفقیت تأیید شد!");

          // ریلود صفحه برای به‌روزرسانی وضعیت
          window.location.reload();
        } catch (storageError) {
          console.error("Error updating localStorage:", storageError);
        }
      } else {
        setPhoneError(data.message);
      }
    } catch (error) {
      setPhoneError("خطا در تأیید شماره موبایل");
      console.error("Error verifying phone:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // اعتبارسنجی فرم
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError("لطفاً تمام فیلدها را پر کنید");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("رمز عبور جدید با تکرار آن مطابقت ندارد");
      return;
    }

    if (newPassword.length < 6) {
      setFormError("رمز عبور باید حداقل 6 کاراکتر باشد");
      return;
    }

    setIsSubmitting(true);

    try {
      // ارسال درخواست به API برای تغییر رمز عبور
      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userInfo._id,
          currentPassword: currentPassword,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در تغییر رمز عبور");
      }

      // موفقیت
      setFormSuccess("رمز عبور با موفقیت تغییر یافت");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-16">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md relative">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between">
          <div className="flex flex-col text-center md:text-right">
            <h2 className="text-2xl font-bold">
              {getRoleName(userInfo?.role)}
            </h2>
            <p className="text-white mt-2">{userInfo?.fullName}</p>
            <p className="text-white mt-2">کد کاربری: {userInfo?.nationalId}</p>
            {userInfo?.academicYear && (
              <p className="text-white mt-2">
                سال تحصیلی: {userInfo?.academicYear || "تعیین نشده"}
              </p>
            )}
            {/* {userInfo?.examCenter?.address && (
              <p className="text-white mt-1">
                آدرس واحد سازمانی: {userInfo?.examCenter?.address || "تعیین نشده"}
              </p>
            )} */}
          </div>
          {/* <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-md border-4 border-white">
            {userInfo?.fullName }
          </div> */}
        </div>
      </div>

      {/* اطلاعات واحد سازمانی */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-800">
            اطلاعات واحد سازمانی
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {userInfo?.province && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 transition-all duration-300 hover:shadow-md border border-blue-100">
                <div className="flex items-start mb-2">
                  <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h4 className="text-sm font-semibold text-gray-500">
                      استان
                    </h4>
                    <div className="mt-1 text-lg font-bold text-gray-800">
                      {userInfo.province.name}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-2 border-t border-blue-100 pt-2">
                  {userInfo.province.code && (
                    <div className="flex justify-between items-center">
                      <span>کد استان:</span>
                      <span className="font-medium">
                        {userInfo.province.code}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {userInfo?.district && (
              <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-4 transition-all duration-300 hover:shadow-md border border-teal-100">
                <div className="flex items-start mb-2">
                  <div className="flex-shrink-0 bg-teal-100 rounded-lg p-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-teal-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h4 className="text-sm font-semibold text-gray-500">
                      منطقه
                    </h4>
                    <div className="mt-1 text-lg font-bold text-gray-800">
                      {userInfo.district.name}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-teal-600 mt-2 border-t border-teal-100 pt-2">
                  {userInfo.district.code && (
                    <div className="flex justify-between items-center">
                      <span>کد منطقه:</span>
                      <span className="font-medium">
                        {userInfo.district.code}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {userInfo?.examCenter && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 transition-all duration-300 hover:shadow-md border border-amber-100">
                <div className="flex items-start mb-2">
                  <div className="flex-shrink-0 bg-amber-100 rounded-lg p-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-amber-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h4 className="text-sm font-semibold text-gray-500">
                      واحد سازمانی
                    </h4>
                    <div className="mt-1 text-lg font-bold text-gray-800">
                      {userInfo.examCenter.name}
                    </div>
                  </div>
                </div>
                {(userInfo.examCenter.code || userInfo.examCenter.address) && (
                  <div className="text-xs text-amber-600 mt-2 border-t border-amber-100 pt-2">
                    {userInfo.examCenter.code && (
                      <div className="flex justify-between items-center mb-1">
                        <span>کد مرکز:</span>
                        <span className="font-medium">
                          {userInfo.examCenter.code}
                        </span>
                      </div>
                    )}
                    {userInfo.examCenter.address && (
                      <div className="flex items-start mb-1">
                        <span>آدرس:</span>
                        <span className="font-medium mr-1 text-right">
                          {userInfo.examCenter.address}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!userInfo?.province &&
              !userInfo?.district &&
              !userInfo?.examCenter && (
                <div className="col-span-full bg-gray-50 rounded-lg p-6 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-gray-600">
                    اطلاعات واحد سازمانی برای شما تعیین نشده است
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* بخش‌های اطلاعات تماس و تغییر رمز عبور در یک ردیف در دسکتاپ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* بخش اطلاعات تماس */}
        <div className="bg-white shadow rounded-lg overflow-hidden h-full">
          <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <h3 className="text-lg font-medium text-white flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-2 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              اطلاعات تماس
            </h3>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 h-full">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 overflow-hidden shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 space-y-4 sm:space-y-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-lg p-2 ml-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500">
                      شماره موبایل
                    </h4>
                    {!isEditingPhone && (
                      <div className="mt-1 font-bold text-gray-800 flex items-center">
                        {userInfo?.phone ? (
                          <>
                            <span dir="ltr" className="font-mono">
                              {userInfo.phone}
                            </span>
                            {userInfo.phoneVerified ? (
                              <span className="inline-flex items-center mr-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <svg
                                  className="mr-1 h-3 w-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                تأیید شده
                              </span>
                            ) : (
                              <span className="inline-flex items-center mr-2 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                تأیید نشده
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500 italic">ثبت نشده</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {!isEditingPhone ? (
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      {userInfo?.phone ? "ویرایش شماره" : "ثبت شماره"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPhone(false);
                        setShowVerification(false);
                        setPhoneError("");
                        setPhoneSuccess("");
                        // بازگرداندن شماره موبایل به مقدار قبلی
                        if (userInfo?.phone) {
                          setPhone(userInfo.phone);
                        } else {
                          setPhone("");
                        }
                      }}
                      className="text-gray-600 hover:text-gray-800 px-4 py-2 flex items-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1"
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
                      انصراف
                    </button>
                  )}
                </div>
              </div>

              {isEditingPhone && (
                <div className="p-4 pt-0 border-t border-purple-100 mt-3">
                  <div className="flex flex-col space-y-3">
                    <div className="flex w-full rounded-lg overflow-hidden border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 bg-white transition-all duration-200 text-gray-800 placeholder:text-gray-400">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="09xxxxxxxxx"
                        className="block flex-grow py-3 px-4 focus:outline-none text-base font-medium border-0"
                        dir="ltr"
                        maxLength={11}
                        inputMode="tel"
                      />
                      <button
                        type="button"
                        onClick={handlePhoneUpdate}
                        disabled={isSendingCode}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 focus:outline-none disabled:opacity-70 text-sm transition-all duration-200 ease-in-out whitespace-nowrap flex items-center justify-center min-w-[90px]"
                      >
                        {isSendingCode ? (
                          <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <>
                            <span className="hidden sm:inline">ارسال کد</span>
                            <span className="inline sm:hidden">ارسال</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-blue-50 rounded-md p-2 text-xs text-blue-700">
                      <div className="flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mt-0.5 ml-1 text-blue-500 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.
                        </span>
                      </div>
                    </div>

                    {phoneError && (
                      <div className="bg-red-50 border-r-4 border-red-500 p-2 rounded-md text-red-700 text-xs">
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{phoneError}</span>
                        </div>
                      </div>
                    )}

                    {phoneSuccess && (
                      <div className="bg-green-50 border-r-4 border-green-500 p-2 rounded-md text-green-700 text-xs">
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{phoneSuccess}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {showVerification && (
                    <div className="mt-4 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-200 shadow-md">
                      <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-2">
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
                              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-medium text-gray-800">
                          تأیید شماره موبایل
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          کد تأیید به شماره{" "}
                          <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-medium">
                            {phone}
                          </span>{" "}
                          پیامک شد
                        </p>
                      </div>

                      <div className="relative mb-4">
                        <div className="flex">
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) =>
                              setVerificationCode(
                                e.target.value.replace(/[^0-9]/g, "")
                              )
                            }
                            placeholder="کد 5 رقمی را وارد کنید"
                            className="block w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-widest font-mono text-center"
                            dir="ltr"
                            maxLength={5}
                            inputMode="numeric"
                          />
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-2">
                          <button
                            type="button"
                            onClick={handleVerifyPhone}
                            disabled={isVerifying}
                            className="order-1 sm:order-2 w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-white font-medium disabled:opacity-70 transition-all duration-200 ease-in-out"
                          >
                            {isVerifying ? (
                              <div className="flex items-center">
                                <svg
                                  className="animate-spin h-5 w-5 mr-2"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                <span>در حال بررسی...</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>تأیید کد</span>
                              </div>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={sendVerificationCode}
                            className="order-2 sm:order-1 flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors text-sm px-3 py-2 rounded-md hover:bg-blue-50"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 ml-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>ارسال مجدد کد</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 border-t border-gray-200 pt-3 mt-1">
                        <ul className="list-disc list-inside space-y-1">
                          <li>کد تأیید تا 2 دقیقه معتبر است</li>
                          <li>
                            در صورت دریافت نکردن کد، روی «ارسال مجدد» کلیک کنید
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* راهنمای اهمیت تأیید شماره موبایل */}
            <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-2">
                  <svg
                    className="h-5 w-5 text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="mr-3">
                  <h4 className="text-sm font-medium text-indigo-800">
                    نکته مهم در مورد شماره موبایل
                  </h4>
                  <div className="mt-1 text-sm text-indigo-700">
                    <p>
                      ثبت و تأیید شماره موبایل برای استفاده از امکان{" "}
                      <strong>بازیابی رمز عبور</strong> و{" "}
                      <strong>ایجاد تیکت جدید</strong> ضروری است. در صورت
                      فراموشی رمز عبور، رمز جدید به شماره موبایل تأیید شده ارسال
                      خواهد شد.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* بخش تغییر رمز عبور */}
        <div className="bg-white shadow rounded-lg overflow-hidden h-full">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              تغییر رمز عبور
            </h2>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 h-full">
            {formSuccess && (
              <div className="mb-6 p-4 bg-green-50 border-r-4 border-green-500 rounded-md flex items-start shadow-sm">
                <svg
                  className="h-6 w-6 text-green-500 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-green-700">{formSuccess}</p>
              </div>
            )}

            {formError && (
              <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 rounded-md flex items-start shadow-sm">
                <svg
                  className="h-6 w-6 text-red-500 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700">{formError}</p>
              </div>
            )}

            <form
              className="space-y-6 max-w-xl bg-white p-6 rounded-xl shadow-md border border-green-100"
              onSubmit={handlePasswordChange}
            >
              <div className="space-y-1">
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  رمز عبور فعلی
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1v-1H4a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v2zm-6 5a4 4 0 100-8 4 4 0 000 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="currentPassword"
                    type="password"
                    className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 hover:border-green-300"
                    placeholder="رمز عبور فعلی خود را وارد کنید"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  رمز عبور جدید
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 hover:border-green-300"
                    placeholder="رمز عبور جدید خود را وارد کنید"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  رمز عبور باید حداقل 6 کاراکتر باشد
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  تکرار رمز عبور جدید
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 hover:border-green-300"
                    placeholder="رمز عبور جدید خود را تکرار کنید"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      در حال ارسال...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                      تغییر رمز عبور
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Last login info */}
      <div className="bg-gradient-to-r from-gray-100 to-slate-100 shadow rounded-lg p-6 border border-gray-200">
        <div className="flex items-center text-gray-700 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 ml-2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>آخرین ورود: {new Date().toLocaleDateString("fa-IR")}</span>
        </div>
      </div>
    </div>
  );
}
