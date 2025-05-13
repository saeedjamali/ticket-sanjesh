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
                <div className="px-6 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-blue-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            راهنمای امنیت حساب کاربری
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            مشاهده راهنما
                        </button>
                    </div>
                    {/* <div className="mt-3 text-sm text-blue-700">
                        <p>برای استفاده از امکان بازیابی رمز عبور و افزایش امنیت حساب، لطفاً شماره موبایل خود را تأیید کنید.</p>
                    </div> */}
                </div>
            </div>

            {/* مودال راهنمای کامل */}
            {isModalOpen && (
                <div className="fixed inset-0 overflow-y-auto z-[100]">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
                        {/* پس زمینه تیره */}
                        <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
                            <div className="absolute inset-0 bg-black opacity-40"></div>
                        </div>

                        {/* مودال */}
                        <div className="relative inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full z-[101] border-2 border-white">
                            <div className="bg-gray-50 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-right sm:w-full">
                                        <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6 flex items-center justify-between">
                                            <span className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 ml-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                راهنمای مدیریت رمز عبور و تأیید شماره موبایل
                                            </span>
                                            <button
                                                onClick={closeModal}
                                                className="text-gray-400 hover:text-gray-500 focus:outline-none bg-white p-1 rounded-full"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </h3>

                                        <div className="bg-blue-50 p-4 rounded-lg mb-6 shadow-sm border border-blue-100">
                                            <h4 className="text-blue-800 font-medium mb-2">چرا تأیید شماره موبایل مهم است؟</h4>
                                            <p className="text-blue-700 text-sm leading-relaxed">
                                                تأیید شماره موبایل به شما امکان می‌دهد در صورت فراموش کردن رمز عبور، به سرعت و با امنیت بالا رمز جدید دریافت کنید. همچنین این کار امنیت حساب کاربری شما را افزایش می‌دهد.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="border-r-4 border-blue-500 pr-4 py-1 bg-white shadow-sm rounded-lg p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1">فرایند تأیید شماره موبایل</h4>
                                                <ol className="text-sm text-gray-600 mr-6 space-y-2 list-decimal">
                                                    <li>در صفحه پروفایل، بخش "شماره موبایل" را پیدا کنید.</li>
                                                    <li>شماره موبایل خود را وارد کرده و دکمه "ارسال کد" را کلیک کنید.</li>
                                                    <li>کد تأیید به شماره موبایل شما پیامک می‌شود.</li>
                                                    <li>کد دریافتی را در محل مشخص شده وارد کرده و روی دکمه "تأیید" کلیک کنید.</li>
                                                    <li>پس از تأیید موفق، شماره موبایل شما در سیستم ثبت خواهد شد.</li>
                                                </ol>
                                            </div>

                                            <div className="border-r-4 border-green-500 pr-4 py-1 bg-white shadow-sm rounded-lg p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1">بازیابی رمز عبور</h4>
                                                <ol className="text-sm text-gray-600 mr-6 space-y-2 list-decimal">
                                                    <li>در صفحه ورود روی گزینه "فراموشی رمز عبور" کلیک کنید.</li>
                                                    <li>کد ملی خود را وارد کنید.</li>
                                                    <li>یک رمز عبور موقت به شماره موبایل تأیید شده شما ارسال می‌شود.</li>
                                                    <li>با رمز موقت وارد سیستم شوید و در اولین فرصت آن را تغییر دهید.</li>
                                                </ol>
                                            </div>

                                            <div className="border-r-4 border-amber-500 pr-4 py-1 bg-white shadow-sm rounded-lg p-3 border border-gray-100">
                                                <h4 className="font-medium text-gray-800 mb-1">توصیه‌های امنیتی</h4>
                                                <ul className="text-sm text-gray-600 mr-6 space-y-2 list-disc">
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
                            <div className="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    متوجه شدم
                                </button>
                                <a
                                    href="/dashboard/profile"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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