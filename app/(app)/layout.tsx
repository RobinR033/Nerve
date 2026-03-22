import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { PushSetup } from "@/components/notifications/PushSetup";

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
      {/* pt-safe zorgt dat content niet achter Dynamic Island/notch valt */}
      <div className="flex h-screen overflow-hidden pt-safe" style={{ background: "#FAFAF8" }}>
        {/* Sidebar: alleen zichtbaar op desktop */}
        <AppSidebar user={user} />
        {/* Hoofdinhoud: pb-safe + 4rem zodat content boven bottom nav + iOS home indicator valt */}
        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      {/* Bottom nav: alleen zichtbaar op mobiel */}
      <BottomNav />
      {/* Push notificaties registreren op de achtergrond */}
      <PushSetup />
    </CaptureProvider>
  );
}
