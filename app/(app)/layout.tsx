import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CaptureProvider } from "@/components/capture/CaptureProvider";
import { PushSetup } from "@/components/notifications/PushSetup";
import { ProjectSetup } from "@/components/layout/ProjectSetup";
import { CategoryToggle } from "@/components/layout/CategoryToggle";
import { SearchBar } from "@/components/layout/SearchBar";
import { ToastContainer } from "@/components/ui/Toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return (
    <CaptureProvider>
      {/* Warm crème → koud blauwwit verloop, duidelijk zichtbaar */}
      <div
        className="flex h-screen overflow-hidden relative"
        style={{
          background:
            "linear-gradient(180deg, #FFEAD0 0%, #F2E8DC 32%, #DDE6F7 68%, #C9DDFA 100%)",
        }}
      >
        {/* Sidebar: alleen zichtbaar op desktop */}
        <AppSidebar user={user} />

        {/* Rechterkolom */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Sticky top bar — hoogte groeit mee met de safe area inset (status bar) */}
          <div
            className="flex items-end justify-end px-4 shrink-0 border-b"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              height: "calc(3rem + env(safe-area-inset-top))",
              borderColor: "rgba(60,40,30,0.06)",
              // Dicht (niet doorschijnend): iOS legt zelf een vervaging onder de statusbalk,
              // over een doorschijnende balk gaf dat een rare fade
              background: "#FFF3E6",
            }}
          >
            <div className="h-12 flex items-center flex-1">
              <SearchBar />
              <CategoryToggle />
            </div>
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
      <ToastContainer />
    </CaptureProvider>
  );
}
