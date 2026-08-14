import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DebugScreen } from "@/components/debug/debug-screen";
import { isPreviewEnvironment } from "@/lib/server/cookies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Swedle Preview Control",
  robots: { index: false, follow: false },
};

export default function DebugPage() {
  if (!isPreviewEnvironment()) notFound();
  return <DebugScreen />;
}
