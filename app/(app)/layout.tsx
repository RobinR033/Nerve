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
      {/* Animated mesh background */}
      <div
        className="flex h-screen overflow-hidden pt-safe relative"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 0% 30%, rgba(110,200,255,0.35) 0%, transparent 55%)," +
            "radial-gradient(ellipse 70% 60% at 100% 80%, rgba(199,180,255,0.4) 0%, transparent 60%)," +
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,182,217,0.28) 0%, transparent 60%)," +
            "linear-gradient(180deg, #F4F8FF 0%, #F8F4FF 100%)",
        }}
      >
        {/* Floating blobs */}
        <div className="nerve-blob1" style={{ zIndex: 0 }} />
        <div className="nerve-blob2" style={{ zIndex: 0 }} />
        <div className="nerve-blob3" style={{ zIndex: 0 }} />

        {/* Sidebar: alleen zichtbaar op desktop */}
        <AppSidebar user={user} />

        {/* Rechterkolom */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Sticky top bar */}
          <div
            className="flex items-center justify-end px-4 h-12 shrink-0 border-b"
            style={{
              borderColor: "rgba(255,255,255,0.5)",
              background: "rgba(255,253,250,0.55)",
              backdropFilter: "blur(8px) saturate(120%)",
              WebkitBackdropFilter: "blur(8px) saturate(120%)",
            }}
          >
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
