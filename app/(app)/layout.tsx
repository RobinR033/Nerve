import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
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
        {/* Sidebar: alleen zichtbaar op desktop */}
        <AppSidebar user={user} />
        {/* Hoofdinhoud: extra padding-bottom op mobiel voor de bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      {/* Bottom nav: alleen zichtbaar op mobiel */}
      <BottomNav />
    </CaptureProvider>
  );
}
