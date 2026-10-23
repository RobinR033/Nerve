import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectenPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return <ProjectsClient />;
}
