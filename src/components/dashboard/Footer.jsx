export default function Footer() {
    const currentYear = new Date().toLocaleDateString("fa-IR", { year: "numeric" });

    return (
        <footer className="bg-white shadow-lg mt-auto sticky bottom-0 w-full z-10">
            <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <div className="text-center sm:text-right mt-3 sm:mt-0">
                    <p className="text-caption text-gray-500">
                        {currentYear} &copy; اداره کل آموزش و پرورش خراسان رضوی، تمامی حقوق محفوظ است.
                    </p>
                </div>
                <div className="flex justify-center sm:order-2">
                    <a
                        href="https://sabzlearn.ir"
                        className="text-caption text-gray-400 hover:text-gray-500"
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