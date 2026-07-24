import type { Metadata } from "next";

import MediaStudio from "./MediaStudio";

export const metadata: Metadata = {
  title: "DPAL Evidence Studio",
  description:
    "Create governed video drafts and server-verified media production records inside DPAL.",
};

export default function MediaStudioPage() {
  return <MediaStudio />;
}
