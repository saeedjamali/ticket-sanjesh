import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key-here";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-jwt-refresh-secret-key-here";
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || "15m";
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

// تبدیل زمان‌های انقضا به ثانیه
const parseExpiration = (exp) => {
  const match = exp.match(/^(\d+)([mhd])$/);
  if (!match) return 15 * 60; // default to 15 minutes in seconds

  const [, value, unit] = match;
  const multipliers = {
    m: 60,
    h: 3600,
    d: 86400,
  };
  return parseInt(value) * multipliers[unit];
};

export const tokenService = {
  generateAccessToken: async (payload) => {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const expSeconds = parseExpiration(JWT_ACCESS_EXPIRATION);

      return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
        .sign(secret);
    } catch (error) {
      console.error("Error generating access token:", error);
      throw new Error("Failed to generate access token");
    }
  },

  generateRefreshToken: async (payload) => {
    try {
      const secret = new TextEncoder().encode(JWT_REFRESH_SECRET);
      const expSeconds = parseExpiration(JWT_REFRESH_EXPIRATION);

      return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
        .sign(secret);
    } catch (error) {
      console.error("Error generating refresh token:", error);
      throw new Error("Failed to generate refresh token");
    }
  },

  verifyAccessToken: async (token) => {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      if (error.code === "ERR_JWT_EXPIRED") {
        throw new Error("Access token expired");
      }
      console.error("Access token verification error:", error);
      throw new Error("Invalid access token");
    }
  },

  verifyRefreshToken: async (token) => {
    try {
      const secret = new TextEncoder().encode(JWT_REFRESH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      if (error.code === "ERR_JWT_EXPIRED") {
        throw new Error("Refresh token expired");
      }
      console.error("Refresh token verification error:", error);
      throw new Error("Invalid refresh token");
    }
  },

  setCookies: (response, { accessToken, refreshToken, user }) => {
    // Set access token cookie
    response.cookies.set("access-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: parseExpiration(JWT_ACCESS_EXPIRATION),
      path: "/",
    });

    // Set refresh token cookie
    if (refreshToken) {
      response.cookies.set("refresh-token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: parseExpiration(JWT_REFRESH_EXPIRATION),
        path: "/",
      });
    }

    // Set user info cookie (non-sensitive data only)
    if (user) {
      response.cookies.set(
        "user",
        JSON.stringify({
          id: user.id,
          fullName: user.fullName,
          role: user.role,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: parseExpiration(JWT_REFRESH_EXPIRATION),
          path: "/",
        }
      );
    }
  },

  clearCookies: (response) => {
    response.cookies.set("access-token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("refresh-token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("user", "", {
      httpOnly: false,
      expires: new Date(0),
      path: "/",
    });
  },
};
