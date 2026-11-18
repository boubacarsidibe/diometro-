import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { JournalList } from "@/components/console/JournalList";
import { loadConsole, loadJournal } from "../data";

export default async function JournalPage() {
  const { s } = await loadConsole();
  const { entries, journalReady } = await loadJournal();
  return (
    <>
      <ConsoleHeader s={s} title="Journal" sub="Inscriptions, modifications d'abonnement et relances, de la plus récente à la plus ancienne." />
      <div className="cs-content">
        <section className="cs-panel"><JournalList entries={entries} ready={journalReady} tz={s.timeZone} /></section>
      </div>
    </>
  );
}
