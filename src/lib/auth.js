import { jwtVerify, SignJWT } from "jose";
import User from "@/models/User";
import connectDB from "@/lib/db";
import { tokenService } from "@/lib/auth/tokenService";

// تنظیمات توکن JWT
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-fallback-secret-key-replace-in-production"
);
const TOKEN_EXPIRY = "7d"; // 7 روز

/**
 * ایجاد توکن JWT برای کاربر
 * @param {string} userId - شناسه کاربر
 * @returns {Promise<string>} - توکن JWT ایجاد شده
 */
export async function createToken(userId) {
  try {
    return await new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  } catch (error) {
    console.error("خطا در ایجاد توکن:", error);
    throw new Error("خطا در ایجاد توکن احراز هویت");
  }
}

/**
 * بررسی معتبر بودن توکن JWT
 * @param {string} token - توکن JWT
 * @returns {Promise<Object|null>} - اطلاعات کاربر در صورت معتبر بودن توکن
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error("خطا در بررسی توکن:", error);
    return null;
  }
}

/**
 * استخراج توکن از درخواست
 * @param {Request} request - درخواست HTTP
 * @returns {string|null} - توکن استخراج شده یا null
 */
export function getTokenFromRequest(request) {
  // تلاش برای استخراج از هدر Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // تلاش برای استخراج از پارامتر کوئری
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // تلاش برای استخراج از کوکی‌ها - بدون استفاده از next/headers
  // از آنجا که Request آبجکت معمولاً cookies را دارد، به صورت مستقیم به آن دسترسی می‌یابیم
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});

    if (cookies["auth-token"]) {
      return cookies["auth-token"];
    }
  }

  return null;
}

/**
 * Authentication middleware for server components/routes
 * @returns {Promise<Object|null>} - User session or null if not authenticated
 */
export async function auth() {
  try {
    // Cannot use headers in a synchronous function on the server side
    // This is always used in API routes, so we'll handle this in the route handlers
    // For other usage, we'll use localStorage in SessionSync.js

    // For now, just return null - this will be replaced with actual auth logic in each API route
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

/**
 * بررسی سطح دسترسی کاربر
 * @param {string} userRole - نقش کاربر
 * @param {string[]} allowedRoles - نقش‌های مجاز
 * @returns {boolean} - آیا کاربر دسترسی دارد
 */
export function checkPermission(userRole, allowedRoles) {
  // اگر systemAdmin باشد، به همه چیز دسترسی دارد
  if (userRole === "systemAdmin") {
    return true;
  }

  return allowedRoles.includes(userRole);
}

/**
 * تبدیل نقش کاربر به سطح دسترسی
 * @param {string} role - نقش کاربر
 * @returns {number} - سطح دسترسی (1 بالاترین، 7 پایین‌ترین)
 */
export function getRoleLevel(role) {
  const roleLevels = {
    systemAdmin: 1,
    generalManager: 2,
    provinceEducationExpert: 3,
    provinceTechExpert: 3,
    districtEducationExpert: 4,
    districtTechExpert: 4,
    examCenterManager: 5,
  };

  return roleLevels[role] || 999; // سطح نامشخص
}

export async function validateAccessToken(token) {
  try {
    const decoded = await tokenService.verifyAccessToken(token);
    return decoded && decoded.userId ? decoded : null;
  } catch (error) {
    console.error("Access token validation error:", error);
    return null;
  }
}

export async function validateRefreshToken(token) {
  try {
    const decoded = await tokenService.verifyRefreshToken(token);
    return decoded && decoded.userId ? decoded : null;
  } catch (error) {
    console.error("Refresh token validation error:", error);
    return null;
  }
}
