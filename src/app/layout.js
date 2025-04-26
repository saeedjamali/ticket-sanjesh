import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NextAuthProvider from "@/components/providers/NextAuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "سامانه تیکتینگ",
  description: "سامانه تیکتینگ مرکز آزمون",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <NextAuthProvider>{children}</NextAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
