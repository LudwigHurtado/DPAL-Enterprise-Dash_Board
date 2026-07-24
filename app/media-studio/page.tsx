import type { Metadata } from "next";

import MediaStudio from "./MediaStudio";

export const metadata: Metadata = {
  title: "DPAL Media Studio",
  description: "Create reviewable, evidence-grounded video drafts with MoneyPrinterTurbo.",
};

export default function MediaStudioPage() {
  return <MediaStudio />;
}
