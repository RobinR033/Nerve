import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CaptureProvider } from "@/components/capture/CaptureProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <CaptureProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "#FAFAF8" }}>
        <AppSidebar user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </CaptureProvider>
  );
}
