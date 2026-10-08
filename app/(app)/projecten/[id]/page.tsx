import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDossierClient } from "./ProjectDossierClient";

export default async function ProjectDossierPage(props: PageProps<"/projecten/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await props.params;
  return <ProjectDossierClient projectId={id} />;
}
