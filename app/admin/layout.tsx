import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin: ICOS 2027",
  description: "Admin seating chart and registrations for International Conference of Orthodontic Society 2027.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
