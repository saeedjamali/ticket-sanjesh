"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import {
  FaExclamationTriangle,
  FaPhone,
  FaSpinner,
  FaCheckCircle,
  FaTimes,
  FaShieldAlt,
  FaLock,
  FaArrowRight,
  FaClock,
  FaRedo,
} from "react-icons/fa";

export default function EmergencyTransferPage() {
  const { user, loading: userLoading } = useUserContext();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // تابع برای mask کردن شماره همراه
  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 8) return phone;
    const firstThree = phone.slice(0, 3);
    const lastTwo = phone.slice(-2);
    const masked = "*".repeat(phone.length - 5);
    return firstThree + masked + lastTwo;
  };

  // Set phone number from user when component mounts
  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  // Timer for resend code
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // بررسی دسترسی
  if (!userLoading && (!user || user.role !== "transferApplicant")) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">عدم دسترسی</div>
        <div className="text-gray-600">شما دسترسی به این صفحه ندارید.</div>
      </div>
    );
  }

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length !== 11) {
      toast.error("شماره همراه باید 11 رقم باشد");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("کد تایید ارسال شد");
        setCodeSent(true);
        setTimeLeft(120); // 2 minutes
      } else {
        toast.error(data.message || "خطا در ارسال کد");
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast.error("خطا در ارسال کد تایید");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 5) {
      toast.error("کد تایید باید 5 رقم باشد");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/users/phone/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("شماره همراه با موفقیت تایید شد");
        setShowVerificationModal(false);
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.message || "کد تایید نامعتبر است");
      }
    } catch (error) {
      console.error("Error verifying SMS:", error);
      toast.error("خطا در تایید کد");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseModal = () => {
    setShowVerificationModal(false);
    setCodeSent(false);
    setVerificationCode("");
    setTimeLeft(0);
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  // اگر کاربر احراز هویت نشده باشد
  if (!user?.phoneVerified) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <div className="flex items-center gap-4 text-white">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FaArrowRight className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">درخواست انتقال</h1>
                    <p className="text-orange-100 text-sm">
                      سیستم ثبت درخواست انتقال پرسنل
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Verification Required */}
            <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden">
              <div className="p-8">
                <div className="text-center">
                  <div className="bg-orange-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FaShieldAlt className="h-10 w-10 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    احراز هویت ضروری است
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    برای دسترسی به سیستم درخواست انتقال اضطرار، ابتدا باید شماره
                    همراه خود را تایید کنید. این اقدام برای امنیت و صحت اطلاعات
                    شما انجام می‌شود.
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-3 relative">
                      <div className="text-sm text-yellow-800 flex flex-col items-center gap-1 ">
                        <FaExclamationTriangle className="h-5 w-5 text-yellow-600 absolute right-0 top-0 " />
                        <div className="flex items-center gap-2">
                          <p className="font-medium mb-1">توجه مهم:</p>
                        </div>
                        <p className="text-right">
                          شماره همراه شما در سیستم ثبت شده:{" "}
                          <span className="font-bold" dir="ltr">
                            {maskPhoneNumber(user?.phone)}
                          </span>
                        </p>
                        <p className="mt-1 text-right">
                          کد تایید به همین شماره ارسال خواهد شد و امکان تغییر آن
                          وجود ندارد.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg"
                  >
                    <FaPhone className="h-5 w-5" />
                    شروع احراز هویت
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <FaPhone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        احراز هویت شماره همراه
                      </h3>
                      <p className="text-orange-100 text-sm flex items-center gap-292" >
                        تایید شماره:
                        <div
                        
                        dir="ltr"
                      >
                        {maskPhoneNumber(phoneNumber)}
                      </div>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {!codeSent ? (
                  <>
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        کد تایید به شماره همراه زیر ارسال خواهد شد:
                      </p>
                      <div
                        className="bg-gray-100 p-3 rounded-lg font-bold text-lg text-center"
                        dir="ltr"
                      >
                        {maskPhoneNumber(phoneNumber)}
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        ⚠️ امکان تغییر شماره همراه وجود ندارد
                      </p>
                    </div>

                    <button
                      onClick={handleSendCode}
                      disabled={isVerifying}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <FaSpinner className="animate-spin h-5 w-5" />
                      ) : (
                        <FaPhone className="h-5 w-5" />
                      )}
                      {isVerifying ? "در حال ارسال..." : "ارسال کد تایید"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <FaCheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-gray-600 mb-4 text-center">
                        کد تایید به شماره{" "}
                        <span className="font-bold" dir="ltr">
                          {maskPhoneNumber(phoneNumber)}
                        </span>{" "}
                        ارسال شد
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                        کد تایید (5 رقم)
                      </label>

                      {/* Input boxes container */}
                      <div className="flex justify-center gap-3 mb-4" dir="ltr">
                        {[...Array(5)].map((_, index) => (
                          <div key={index} className="relative">
                            <input
                              type="text"
                              maxLength="1"
                              value={verificationCode[index] || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 1) {
                                  const newCode = verificationCode.split("");
                                  newCode[index] = value;
                                  const finalCode = newCode
                                    .join("")
                                    .slice(0, 5);
                                  setVerificationCode(finalCode);

                                  // Auto focus next input (left to right)
                                  if (value && index < 4) {
                                    const nextInput = document.querySelector(
                                      `input[data-index="${index + 1}"]`
                                    );
                                    if (nextInput) nextInput.focus();
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Handle backspace (right to left navigation)
                                if (
                                  e.key === "Backspace" &&
                                  !verificationCode[index] &&
                                  index > 0
                                ) {
                                  const prevInput = document.querySelector(
                                    `input[data-index="${index - 1}"]`
                                  );
                                  if (prevInput) prevInput.focus();
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              data-index={index}
                              className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 bg-white
                                ${
                                  verificationCode[index]
                                    ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md"
                                    : "border-gray-300 hover:border-gray-400 focus:border-orange-500"
                                }
                                focus:ring-2 focus:ring-orange-500/20 focus:outline-none
                                ${
                                  index === verificationCode.length &&
                                  !verificationCode[index]
                                    ? "border-orange-400 ring-2 ring-orange-500/30"
                                    : ""
                                }`}
                              dir="ltr"
                              autoComplete="one-time-code"
                            />

                            {/* Active indicator */}
                            {index === verificationCode.length &&
                              !verificationCode[index] && (
                                <div className="absolute inset-0 border-2 border-orange-500 rounded-xl animate-pulse pointer-events-none"></div>
                              )}

                            {/* Success checkmark */}
                            {verificationCode[index] && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <FaCheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Hidden input for paste functionality */}
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 5);
                          setVerificationCode(value);
                          if (value.length === 5) {
                            e.target.blur();
                          }
                        }}
                        className="opacity-0 absolute -z-10"
                        placeholder="Paste code here"
                      />

                      <p className="text-xs text-gray-500 text-center">
                        کد 5 رقمی ارسال شده را وارد کنید
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyCode}
                        disabled={isVerifying || verificationCode.length !== 5}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <FaSpinner className="animate-spin h-5 w-5" />
                        ) : (
                          <FaCheckCircle className="h-5 w-5" />
                        )}
                        {isVerifying ? "در حال تایید..." : "تایید کد"}
                      </button>

                      <button
                        onClick={handleSendCode}
                        disabled={isVerifying || timeLeft > 0}
                        className="px-6 py-3 border border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {timeLeft > 0 ? (
                          <>
                            <FaClock className="h-4 w-4" />
                            <span dir="ltr">{timeLeft}s</span>
                          </>
                        ) : (
                          <>
                            <FaRedo className="h-4 w-4" />
                            ارسال مجدد
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // اگر کاربر احراز هویت شده باشد - صفحه اصلی
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <FaArrowRight className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">درخواست انتقال</h1>
                <p className="text-blue-100 text-sm">
                  سیستم ثبت درخواست انتقال پرسنل
                </p>
              </div>
              <div className="mr-auto bg-green-500/20 px-3 py-1 rounded-lg">
                <div className="flex items-center gap-2 text-green-100">
                  <FaCheckCircle className="h-4 w-4" />
                  <span className="text-sm">احراز شده</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FaLock className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                سیستم در حال توسعه
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                بخش درخواست انتقال در حال توسعه و بهبود است.
                <br />
                این قابلیت به زودی در دسترس خواهد بود.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 justify-center">
                  <FaCheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-blue-800">
                    شماره همراه شما با موفقیت تایید شده است:{" "}
                    <strong dir="ltr">{maskPhoneNumber(user?.phone)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
