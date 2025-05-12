import path from "path";
import fs from "fs";
import { authService } from "@/lib/auth/authService";

export async function GET(req, { params }) {
  try {
    // Authenticate the user
    const user = await authService.validateToken(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { filename } = await params;

    // Check if the path contains "announcements/" prefix
    let filePath;
    if (filename.startsWith("announcements/")) {
      filePath = path.join(process.cwd(), "uploads", filename);
    } else {
      filePath = path.join(process.cwd(), "uploads", "announcements", filename);
    }

    console.log("Announcement image path:", filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new Response("Image not found", { status: 404 });
    }

    const file = fs.readFileSync(filePath);

    // Determine content type based on file extension
    let contentType = "image/jpeg"; // Default
    if (filePath.endsWith(".png")) {
      contentType = "image/png";
    } else if (filePath.endsWith(".gif")) {
      contentType = "image/gif";
    } else if (filePath.endsWith(".webp")) {
      contentType = "image/webp";
    }

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    console.error("Error retrieving announcement image:", err);
    return new Response("File not found", { status: 404 });
  }
}
