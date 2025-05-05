import { NextResponse } from "next/server";
import { tokenService } from "@/lib/auth/tokenService";
import { cookies } from "next/headers";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth/login",
  "/api/direct-login",
  "/api/auth/refresh", // اضافه کردن مسیر refresh به مسیرهای عمومی
];

const PUBLIC_PREFIXES = ["/api/public/", "/_next/", "/fonts/", "/images/"];

export async function middleware(request) {
  //  console.log("middlewawre 1----->",request.nextUrl)

  const { pathname } = request.nextUrl;

  // اگر مسیر /login است، middleware را ادامه بده و ریدایرکت نکن
  // if (pathname === "/login") {
  //   return NextResponse.next();
  // }
  let accessToken = request.cookies.get("token")?.value;
  let refreshToken = request.cookies.get("refresh-token")?.value;
  const refreshTokenPayload = await tokenService.verifyAccessToken(
    refreshToken
  );
  const accessTokenPayload = await tokenService.verifyAccessToken(accessToken);
  // console.log("accessTokenPayload---->", accessTokenPayload);
  if (accessTokenPayload) {
    return NextResponse.next();
    // return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!refreshTokenPayload) {
    
    return NextResponse.next();
  }
  const newAccessToken = await tokenService.generateAccessToken({
    phone: refreshTokenPayload.phone,
    role: refreshTokenPayload.role,
  });
  const response = NextResponse.next();
  response.cookies.set({
    name: "token",
    value: newAccessToken,
    path: "/",
    httpOnly: true,
  });
  return response;
  // }
  console.log(
    "<---- MiddleWare is ok---->",
    tokenService.verifyAccessToken(accessToken)
  );
  return NextResponse.next();
  // const { pathname } = req.nextUrl;
  // if (pathname === "/login") {
  //   return NextResponse.next();
  // }
  // const cookieStore = await cookies();
  // const accessToken = cookieStore?.get("access-token");
  // const refreshToken = cookieStore?.get("refresh-token");

  // // 1. بررسی access token
  // if (accessToken) {
  //   console.log("accessToken---->", accessToken);
  //   try {
  //     await tokenService.verifyAccessToken(accessToken);
  //     // اگر معتبر بود
  //     const { payload } = await jwtVerify(accessToken, tokenService.secret);
  //     req.user = payload;
  //     console.log("req.user---->", req.user);
  //     return NextResponse.next();
  //   } catch (err) {
  //     // اگر نامعتبر یا منقضی بود، ادامه بده به بررسی refresh token
  //   }
  // }

  // // 2. بررسی refresh token
  // if (refreshToken) {
  //   console.log("refreshToken---->", refreshToken);
  //   try {
  //     const user = await tokenService.verifyRefreshToken(refreshToken);
  //     // اگر معتبر بود، یک access token جدید بساز و ست کن
  //     const newAccessToken = await tokenService.generateAccessToken({
  //       userId: user._id,
  //       role: user.role,
  //     });

  //     // ست کردن توکن جدید در کوکی
  //     const response = NextResponse.next();
  //     response.cookies.set("access-token", newAccessToken, {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === "production",
  //       sameSite: "lax",
  //       path: "/",
  //     });
  //     req.user = user;
  //     return response;
  //   } catch (err) {
  //     // اگر refresh token هم نامعتبر بود، ریدایرکت به لاگین
  //     const absoluteUrl = `${req.nextUrl.origin}/login`;
  //     return NextResponse.redirect(absoluteUrl);
  //   }
  // }

  // // 3. ریدایرکت به صفحه لاگین (با آدرس مطلق)
  // console.log("No access token provided");

  // return NextResponse.redirect(new URL("/login", req.url));
}

function isPublicPath(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
