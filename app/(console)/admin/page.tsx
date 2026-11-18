import { ConsoleBoard } from "@/components/console/ConsoleBoard";
import { consoleSections } from "@/components/console/ConsoleSections";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { loadConsole } from "./data";

export default async function PlatformPage() {
  const { s, tenants, today } = await loadConsole();
  const { chart, bottom } = consoleSections(tenants, today);
  return (
    <>
      <ConsoleHeader s={s} title={`Bonjour ${s.displayName.split(" ")[0]}`} sub="Vos clients, leurs abonnements et vos revenus estimés." />
      <ConsoleBoard tenants={tenants} today={today} middle={chart} bottom={bottom} />
    </>
  );
}
