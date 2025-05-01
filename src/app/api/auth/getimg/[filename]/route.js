import path from "path";
import fs from "fs";
import { authService } from "@/lib/auth/authService";

export async function GET(req, { params }) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const { filename } = await params;
    const filePath = path.join(process.cwd(), "uploads", filename);
    console.log("filePath---->", filePath);

    const file = fs.readFileSync(filePath);
    console.log("file---------------->", file);
    return new Response(file, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (err) {
    console.log("err---->", err);
    return new Response("File not found", { status: 404 });
  }
}
