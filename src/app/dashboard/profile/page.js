"use client";

import { useUserContext } from "@/context/UserContext";
import { useState, useEffect } from "react";

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
      examCenterManager: "مسئول مرکز آزمون",
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

        // به‌روزرسانی اطلاعات کاربر
        const userResponse = await fetch("/api/users/profile", {
          credentials: "include",
        });
        const userData = await userResponse.json();
        if (userData.success) {
          setUserInfo(userData.user);
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
            <p className="text-white mt-1">کد ملی: {userInfo?.nationalId}</p>
            <p className="text-white mt-1">
              سال تحصیلی: {userInfo?.academicYear || "تعیین نشده"}
            </p>
          </div>
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-md border-4 border-white">
            {userInfo?.fullName ? userInfo.fullName.substring(0, 2) : "مد"}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-800">اطلاعات کاربری</h3>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {userInfo?.province && (
              <div className="flex items-center justify-between border-b pb-4">
                <span className="font-medium text-gray-600">استان</span>
                <div className="flex items-center">
                  <span className="text-gray-900">
                    {userInfo.province.name}
                  </span>
                  <div className="mr-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {userInfo?.district && (
              <div className="flex items-center justify-between py-4">
                <span className="font-medium text-gray-600">منطقه</span>
                <div className="flex items-center">
                  <span className="text-gray-900">
                    {userInfo.district.name}
                  </span>
                  <div className="mr-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* بخش شماره موبایل */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 space-y-2 sm:space-y-0">
              <span className="font-medium text-gray-600">شماره موبایل</span>
              <div className="flex items-center w-full sm:w-auto">
                {!isEditingPhone ? (
                  <>
                    <span className="text-gray-900">
                      {userInfo?.phone ? (
                        <>
                          {userInfo.phone}
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
                        "ثبت نشده"
                      )}
                    </span>
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="mr-2 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm transition duration-150 ease-in-out"
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
                      {userInfo?.phone ? "ویرایش" : "ثبت شماره"}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-end space-y-3 w-full max-w-xs">
                    <div className="flex w-full rounded-lg overflow-hidden border border-gray-300">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="block flex-grow py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm border-0"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handlePhoneUpdate}
                        disabled={isSendingCode}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 text-sm transition-all duration-200 ease-in-out whitespace-nowrap"
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <>
                            <span className="hidden sm:inline">ارسال کد</span>
                            <span className="inline sm:hidden">ارسال</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1 inline"
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

                    {showVerification && (
                      <div className="w-full bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-center mb-2 text-sm text-gray-600">
                          کد تایید به{" "}
                          <span className="text-blue-600 font-medium">
                            {phone}
                          </span>{" "}
                          ارسال شد
                        </div>
                        <div className="flex w-full rounded-lg overflow-hidden border border-gray-300">
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) =>
                              setVerificationCode(e.target.value)
                            }
                            placeholder="کد 5 رقمی را وارد کنید"
                            className="block flex-grow py-3 px-4 focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm border-0"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyPhone}
                            disabled={isVerifying}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70 text-sm transition-all duration-200 ease-in-out whitespace-nowrap"
                          >
                            {isVerifying ? (
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
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              <>
                                <span className="hidden sm:inline">
                                  تایید کد
                                </span>
                                <span className="inline sm:hidden">تایید</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1 inline"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs">
                          <button
                            type="button"
                            onClick={sendVerificationCode}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 ml-1"
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
                            ارسال مجدد
                          </button>
                          <div className="text-gray-500 text-xs">
                            {/* زمان باقیمانده: ۲:۳۵ */}
                          </div>
                        </div>
                      </div>
                    )}

                    {phoneError && (
                      <div className="bg-red-50 border-r-4 border-red-500 p-2 rounded-md text-red-700 text-xs w-full">
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
                      <div className="bg-green-50 border-r-4 border-green-500 p-2 rounded-md text-green-700 text-xs w-full">
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

                    <div className="flex justify-end w-full">
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
                        className="flex items-center text-gray-600 text-xs hover:text-gray-800 transition-colors duration-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 ml-1"
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
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* راهنمای اهمیت تأیید شماره موبایل */}
            <div className="mt-2 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600"
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
                  <h4 className="text-sm font-medium text-blue-800">
                    نکته مهم در مورد شماره موبایل
                  </h4>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>
                      ثبت و تأیید شماره موبایل برای استفاده از امکان{" "}
                      <strong>بازیابی رمز عبور</strong> ضروری است. در صورت
                      فراموشی رمز عبور، رمز جدید به شماره موبایل تأیید شده ارسال
                      خواهد شد.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password change section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
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

        <div className="p-6">
          {formSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-r-4 border-green-500 rounded-md flex items-start">
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
            <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 rounded-md flex items-start">
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

          <form className="space-y-6 max-w-xl" onSubmit={handlePasswordChange}>
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
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
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
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
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
                  className="block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="رمز عبور جدید خود را تکرار کنید"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Last login info */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center text-gray-500 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-gray-400"
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
