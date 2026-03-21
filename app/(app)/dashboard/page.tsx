import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">
          Nerve
        </h1>
        <p className="text-gray-500">Ingelogd als {user.email}</p>
        <p className="text-sm text-gray-400 mt-4">Dashboard komt eraan ⚡</p>
      </div>
    </div>
  );
}
