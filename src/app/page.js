import { FaCog, FaTools, FaClock } from "react-icons/fa";

export default function MaintenancePage() {
  // const { user } = await authService.refreshToken(authToken?.value);
  // console.log("user---->", user);

  // if (user) {
  //   redirect("/dashboard");
  // } else {
  //   redirect("/login");
  // }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo Section */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-600 rounded-full mb-6 shadow-lg">
            <FaTools className="text-white text-3xl animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            سایت در حال بروزرسانی است
          </h1>
          <p className="text-xl text-gray-600">
            ما در حال بهبود خدمات خود هستیم
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-center mb-6">
            <FaCog
              className="text-blue-600 text-5xl animate-spin"
              style={{ animationDuration: "3s" }}
            />
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            بروزرسانی در حال انجام
          </h2>

          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            ما در حال بهبود و بروزرسانی سیستم هستیم تا بتوانیم خدمات بهتری به
            شما ارائه دهیم.
            <br />
            {/* لطفاً چند دقیقه صبر کنید و مجدداً تلاش کنید. */}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full animate-pulse"
              style={{ width: "75%" }}
            ></div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
              <FaClock className="text-blue-600 ml-2" />
              <span className="text-gray-700">بروزرسانی</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
              <FaTools className="text-green-600 ml-2" />
              <span className="text-gray-700">بهبود عملکرد</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-purple-50 rounded-lg">
              <FaCog className="text-purple-600 ml-2" />
              <span className="text-gray-700">ویژگی‌های جدید</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {/* <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            نیاز به کمک دارید؟
          </h3>
          <p className="text-gray-600 mb-4">
            در صورت وجود مسئله فوری، می‌توانید با تیم پشتیبانی تماس بگیرید.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-gray-500 text-sm">ایمیل:</span>
              <span className="text-gray-800 font-medium mr-2">
                support@example.com
              </span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-gray-500 text-sm">تلفن:</span>
              <span className="text-gray-800 font-medium mr-2">
                021-12345678
              </span>
            </div>
          </div>
        </div> */}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-caption text-gray-500">
            &copy; اداره کل آموزش و پرورش خراسان رضوی، تمامی حقوق
            محفوظ است.
          </p>
          {/* <p className="text-gray-400 text-xs mt-2">
            زمان تخمینی بازگشت: 
          </p> */}
        </div>
      </div>
    </div>
  );
}
