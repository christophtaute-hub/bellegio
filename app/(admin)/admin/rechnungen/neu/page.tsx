import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import { NeueRechnungForm } from "@/components/admin/neue-rechnung-form";

export default async function NeueRechnungPage() {
  const supabase = await createClient();
  const { data: traeger } = await supabase.from("trager").select("id, name").order("name");
  const heute = toIsoDateString(new Date());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">Neue Rechnung</h1>
      <NeueRechnungForm traeger={traeger ?? []} defaultMonat={heute.slice(0, 7)} />
    </div>
  );
}
