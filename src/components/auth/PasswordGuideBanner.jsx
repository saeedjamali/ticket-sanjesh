import React from 'react';
import Link from 'next/link';

/**
 * بنر راهنمای رمز عبور و تأیید شماره موبایل
 * 
 * @param {Object} props 
 * @param {string} props.type - نوع بنر (info, warning, success)
 * @param {string} props.message - پیام اصلی بنر
 * @param {string} props.buttonText - متن دکمه
 * @param {string} props.buttonLink - لینک دکمه
 */
const PasswordGuideBanner = ({
    type = 'info',
    message = 'برای افزایش امنیت حساب کاربری و امکان بازیابی رمز عبور، شماره موبایل خود را تأیید کنید.',
    buttonText = 'رفتن به پروفایل',
    buttonLink = '/dashboard/profile'
}) => {
    // تعیین استایل بر اساس نوع بنر
    const bannerStyles = {
        info: {
            bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
            border: 'border border-blue-200',
            icon: 'text-blue-500',
            text: 'text-blue-700',
            title: 'text-blue-800',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        },
        warning: {
            bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
            border: 'border border-amber-200',
            icon: 'text-amber-500',
            text: 'text-amber-700',
            title: 'text-amber-800',
            button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
        },
        success: {
            bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
            border: 'border border-green-200',
            icon: 'text-green-500',
            text: 'text-green-700',
            title: 'text-green-800',
            button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        },
    };

    const style = bannerStyles[type] || bannerStyles.info;

    // آیکون مناسب بر اساس نوع بنر
    const icons = {
        info: (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        success: (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    const typeIcon = icons[type] || icons.info;
    const title = type === 'info' ? 'راهنمای امنیت حساب کاربری' :
        type === 'warning' ? 'هشدار امنیتی' : 'عملیات موفق';

    return (
        <div className={`rounded-lg shadow-md overflow-hidden ${style.bg} ${style.border}`}>
            <div className="p-5">
                <div className="flex items-start">
                    <div className="flex-shrink-0 ml-3">
                        {typeIcon}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-lg font-medium ${style.title} mb-1`}>
                            {title}
                        </h3>
                        <div className={`text-sm ${style.text}`}>
                            <p>{message}</p>
                        </div>
                    </div>
                    {/* <div className="mr-auto pr-3">
                        <Link href={buttonLink}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${style.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        >
                            {buttonText}
                            <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </Link>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

// بنرهای از پیش تعریف شده برای استفاده راحت‌تر
PasswordGuideBanner.Info = (props) => <PasswordGuideBanner type="info" {...props} />;
PasswordGuideBanner.Warning = (props) => <PasswordGuideBanner type="warning" {...props} />;
PasswordGuideBanner.Success = (props) => <PasswordGuideBanner type="success" {...props} />;

export default PasswordGuideBanner; 