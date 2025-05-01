import { NextResponse } from "next/server";
import { tokenService } from "@/lib/auth/tokenService";

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
  console.log("request in middleware--->", request.nextUrl.origin);
  const pathname = request.nextUrl.pathname;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  try {
    // Get access token from cookie
    const accessToken = request.cookies.get("access-token")?.value;
    if (!accessToken) {
      throw new Error("No access token found");
    }
    console.log("accessToken in middleware--->", accessToken);
    // Verify access token
    try {
      const decoded = await tokenService.verifyAccessToken(accessToken);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid access token");
      }
      return NextResponse.next();
    } catch (tokenError) {
      console.log("tokenError in middleware--->", tokenError);
      // If access token is expired or invalid, try refresh token
      const refreshToken = request.cookies.get("refresh-token")?.value;
      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      // Try to verify refresh token
      try {
        const decoded = await tokenService.verifyRefreshToken(refreshToken);
        if (!decoded || !decoded.userId) {
          throw new Error("Invalid refresh token");
        }

        // Redirect to refresh endpoint to get new tokens
        const refreshUrl = new URL("/", request.url);
        return NextResponse.redirect(refreshUrl);
      } catch (refreshError) {
        console.error("Refresh token error:", refreshError);
        throw new Error("Invalid refresh token");
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Redirect to login for non-API routes
    if (!pathname.startsWith("/api/")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API routes
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: error.message || "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
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
