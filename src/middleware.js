import { NextResponse } from "next/server";

// مسیرهایی که نباید ریدایرکت شوند (فایل‌های استاتیک و API)
const EXCLUDED_PATHS = [
  "/_next/",
  "/favicon.ico",
  "/api/",
  "/fonts/",
  "/images/",
  "/uploads/",
  "/public/",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // اگر درخواست برای صفحه اصلی است، اجازه ادامه بده
  if (pathname === "/") {
    return NextResponse.next();
  }

  // اگر درخواست برای مسیرهای مستثنی است، اجازه ادامه بده
  for (const excludedPath of EXCLUDED_PATHS) {
    if (pathname.startsWith(excludedPath)) {
      return NextResponse.next();
    }
  }

  // همه درخواست‌های دیگر را به صفحه اصلی ریدایرکت کن
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
