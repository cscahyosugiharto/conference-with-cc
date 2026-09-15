import { AdminApp } from "@/components/AdminApp";
import { readHallState } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initial = await readHallState();
  return <AdminApp initial={initial} />;
}
