import React, { useState } from 'react';

const PasswordGuideModal = ({ isOpen = false, onClose }) => {
    const [isModalOpen, setIsModalOpen] = useState(isOpen);

    const closeModal = () => {
        setIsModalOpen(false);
        if (onClose) onClose();
    };

    return (
        <>
            {/* بنر راهنما */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg shadow-md overflow-hidden border border-blue-200">
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                        <h3 className="text-lg font-medium text-blue-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 sm:h-6 sm:w-6 sm:ml-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            راهنمای امنیت حساب کاربری
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center justify-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                        >
                            مشاهده راهنما
                        </button>
                    </div>
                </div>
            </div>

            {/* مودال راهنمای کامل */}
            {isModalOpen && (
                <div className="fixed inset-0 overflow-y-auto z-[100]">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-1 sm:px-4 pb-20 text-center">
                        {/* پس زمینه تیره */}
                        <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
                            <div className="absolute inset-0 bg-black opacity-40"></div>
                        </div>

                        {/* مودال */}
                        <div className="relative inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl z-[101] border-2 border-white">
                            <div className="bg-gray-50 px-3 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-2 text-center sm:mt-0 sm:text-right sm:w-full">
                                        <h3 className="text-lg sm:text-xl leading-6 font-bold text-gray-900 mb-5 sm:mb-6 flex items-center justify-between">
                                            <span className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 sm:h-7 sm:w-7 sm:ml-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                <span className="text-base sm:text-xl">راهنمای مدیریت رمز عبور</span>
                                            </span>
                                            <button
                                                onClick={closeModal}
                                                className="text-gray-400 hover:text-gray-500 focus:outline-none bg-white p-1 rounded-full"
                                                aria-label="بستن"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </h3>

                                        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 shadow-sm border border-blue-100">
                                            <h4 className="text-blue-800 font-medium mb-2">چرا تأیید شماره موبایل مهم است؟</h4>
                                            <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">
                                                تأیید شماره موبایل به شما امکان می‌دهد در صورت فراموش کردن رمز عبور، به سرعت و با امنیت بالا رمز جدید دریافت کنید. همچنین این کار امنیت حساب کاربری شما را افزایش می‌دهد.
                                            </p>
                                        </div>

                                        <div className="space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] px-1 py-2">
                                            <div className="border-r-4 border-blue-500 pr-2 sm:pr-4 py-1 bg-white shadow-sm rounded-lg p-2 sm:p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1 text-sm sm:text-base">فرایند تأیید شماره موبایل</h4>
                                                <ol className="text-xs sm:text-sm text-gray-600 mr-4 sm:mr-6 space-y-1 sm:space-y-2 list-decimal">
                                                    <li>در صفحه پروفایل، بخش "شماره موبایل" را پیدا کنید.</li>
                                                    <li>شماره موبایل خود را وارد کرده و دکمه "ارسال کد" را کلیک کنید.</li>
                                                    <li>کد تأیید به شماره موبایل شما پیامک می‌شود.</li>
                                                    <li>کد دریافتی را در محل مشخص شده وارد کرده و روی دکمه "تأیید" کلیک کنید.</li>
                                                    <li>پس از تأیید موفق، شماره موبایل شما در سیستم ثبت خواهد شد.</li>
                                                </ol>
                                            </div>

                                            <div className="border-r-4 border-green-500 pr-2 sm:pr-4 py-1 bg-white shadow-sm rounded-lg p-2 sm:p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1 text-sm sm:text-base">بازیابی رمز عبور</h4>
                                                <ol className="text-xs sm:text-sm text-gray-600 mr-4 sm:mr-6 space-y-1 sm:space-y-2 list-decimal">
                                                    <li>در صفحه ورود روی گزینه "فراموشی رمز عبور" کلیک کنید.</li>
                                                    <li>کد ملی خود را وارد کنید.</li>
                                                    <li>یک رمز عبور موقت به شماره موبایل تأیید شده شما ارسال می‌شود.</li>
                                                    <li>با رمز موقت وارد سیستم شوید و در اولین فرصت آن را تغییر دهید.</li>
                                                </ol>
                                            </div>

                                            <div className="border-r-4 border-amber-500 pr-2 sm:pr-4 py-1 bg-white shadow-sm rounded-lg p-2 sm:p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1 text-sm sm:text-base">توصیه‌های امنیتی</h4>
                                                <ul className="text-xs sm:text-sm text-gray-600 mr-4 sm:mr-6 space-y-1 sm:space-y-2 list-disc">
                                                    <li>از رمز عبور قوی استفاده کنید (ترکیبی از حروف، اعداد و علائم).</li>
                                                    <li>رمز عبور خود را به صورت دوره‌ای تغییر دهید.</li>
                                                    <li>رمز عبور خود را در اختیار دیگران قرار ندهید.</li>
                                                    <li>از ذخیره رمز عبور در مرورگرهای عمومی خودداری کنید.</li>
                                                    <li>پس از اتمام کار، حتماً از حساب کاربری خود خارج شوید.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-100 px-3 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row-reverse sm:justify-between">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="w-full mt-2 sm:mt-0 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    متوجه شدم
                                </button>
                                <a
                                    href="/dashboard/profile"
                                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                                >
                                    رفتن به صفحه پروفایل
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PasswordGuideModal; 