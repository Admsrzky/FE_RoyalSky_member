import type { Metadata } from "next";

import { MemberPortal } from "@/components/MemberPortal";
import { demoMember } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Pratinjau Kartu Member",
  description: "Pratinjau desain kartu member digital Royal Sky.",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <MemberPortal initial={demoMember} preview />;
}
