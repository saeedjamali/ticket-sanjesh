export default function Footer() {
    const currentYear = new Date().toLocaleDateString("fa-IR", { year: "numeric" });

    return (
        <footer className="bg-white shadow-lg mt-auto">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
                <div className="text-center md:text-right">
                    <p className="text-sm text-gray-500">
                         {currentYear} &copy; اداره کل آموزش و پرورش خراسان رضوی، تمامی حقوق محفوظ است.
                    </p>
                </div>
                <div className="mt-4 flex justify-center space-x-6 md:mt-0 md:order-2">
                    <a
                        href="https://sabzlearn.ir"
                        className="text-gray-400 hover:text-gray-500"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        اداره فناوری اطلاعات
                    </a>
                    {/* <a
                        href="https://sabzlearn.ir/contact"
                        className="text-gray-400 hover:text-gray-500 mr-6"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        تماس با ما
                    </a> */}
                </div>
            </div>
        </footer>
    );
} 