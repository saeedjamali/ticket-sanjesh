import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import { redirect } from "next/navigation";
import OrganizationalUnitTypeManager from "@/components/admin/OrganizationalUnitTypeManager";

export default async function OrganizationalUnitTypesPage() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");

    if (!authToken?.value) {
      redirect("/auth/login");
    }

    const { user } = await authService.refreshToken(authToken.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      redirect("/access-denied");
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizationalUnitTypeManager />
      </div>
    );
  } catch (error) {
    console.error("خطا در بارگذاری صفحه:", error);
    redirect("/auth/login");
  }
}
