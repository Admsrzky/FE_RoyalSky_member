import { LoginView } from "@/components/LoginView";
import { MemberPortal } from "@/components/MemberPortal";
import { PortalError } from "@/components/PortalError";
import { ApiError } from "@/lib/api";
import { loadMemberData } from "@/lib/member";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) return <LoginView />;

  try {
    const member = await loadMemberData(session);
    return <MemberPortal initial={member} />;
  } catch (error) {
    if (error instanceof ApiError && error.isSessionError) {
      return (
        <LoginView
          notice="Sesi Anda telah berakhir. Silakan masuk kembali dengan PIN Anda."
          clearSession
        />
      );
    }

    return (
      <PortalError
        message={
          error instanceof ApiError
            ? error.message
            : "Data member belum bisa dimuat. Coba lagi beberapa saat."
        }
      />
    );
  }
}
