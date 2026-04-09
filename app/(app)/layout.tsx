import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { PushSetup } from "@/components/notifications/PushSetup";
import { ProjectSetup } from "@/components/layout/ProjectSetup";
import { CategoryToggle } from "@/components/layout/CategoryToggle";

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
      <div className="flex h-screen overflow-hidden pt-safe" style={{ background: "#FAFAF8" }}>
        {/* Sidebar: alleen zichtbaar op desktop */}
        <AppSidebar user={user} />

        {/* Rechterkolom: top bar + hoofdinhoud */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky top bar met toggle — zichtbaar op alle schermformaten */}
          <div className="flex items-center justify-end px-4 h-12 shrink-0 border-b border-gray-100 bg-[#FAFAF8]">
            <CategoryToggle />
          </div>

          {/* Hoofdinhoud */}
          <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      {/* Bottom nav: alleen zichtbaar op mobiel */}
      <BottomNav />
      <PushSetup />
      <ProjectSetup />
    </CaptureProvider>
  );
}
