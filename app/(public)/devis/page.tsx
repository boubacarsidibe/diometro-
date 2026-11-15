import type { Metadata } from "next";
import { DevisForm } from "./DevisForm";
import "./devis.css";

export const metadata: Metadata = {
  title: "Demande de devis · DIOMETRO",
  description: "Décrivez votre parc d'instruments de mesure : nous vous répondons avec une proposition adaptée.",
};

export default async function DevisPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule } = await searchParams;
  return (
    <div className="devis">
      <header className="devis-head">
        <h1>Demande de devis</h1>
        <p>Décrivez votre parc en 2 minutes. Nous vous répondons personnellement avec une proposition adaptée, sans engagement.</p>
      </header>
      <DevisForm formule={formule === "custom" ? "Plus de 2 000" : undefined} />
    </div>
  );
}
