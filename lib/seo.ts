import type { Metadata } from "next";

// Pages publiques : indexables par Google et les autres moteurs de recherche.
export const INDEXABLE: Metadata["robots"] = { index: true, follow: true, googleBot: { index: true, follow: true } };
