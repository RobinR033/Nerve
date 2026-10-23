import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDossierClient } from "./ProjectDossierClient";

export default async function ProjectDossierPage(props: PageProps<"/projecten/[id]">) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const { id } = await props.params;
  return <ProjectDossierClient projectId={id} />;
}
