import { NextResponse } from "next/server";
import { headers } from "next/headers";

// شبیه‌سازی آمار بازدید - در پروژه واقعی از Google Analytics یا database استفاده کنید
const generateVisitStats = () => {
  const now = new Date();
  const baseVisits = 1250; // تعداد پایه بازدید روزانه
  
  // تولید آمار شبیه‌سازی شده
  const daily = Math.floor(baseVisits + Math.random() * 200 - 100);
  const weekly = Math.floor(daily * 7 + Math.random() * 500 - 250);
  const monthly = Math.floor(weekly * 4.3 + Math.random() * 1000 - 500);
  const yearly = Math.floor(monthly * 12 + Math.random() * 5000 - 2500);
  
  return {
    daily,
    weekly,
    monthly,
    yearly,
    lastUpdated: now.toISOString(),
  };
};

export async function GET(request) {
  try {
    // بررسی origin برای امنیت
    const headersList = await headers();
    const origin = headersList.get('origin');
    
    // فقط درخواست‌های از دامنه خودی پذیرفته شوند
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      // در پروداکشن، دامنه اصلی خود را اضافه کنید
      // مثال: if (!origin.includes('yourdomain.com'))
    }

    const stats = generateVisitStats();
    
    return NextResponse.json(
      {
        success: true,
        data: stats,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // کش 5 دقیقه‌ای
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error("Error fetching website visit stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت آمار بازدید",
      },
      { status: 500 }
    );
  }
}
