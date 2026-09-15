import { BookingApp } from "@/components/BookingApp";
import { Masthead, PublicMark } from "@/components/Masthead";
import { readHallState } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initial = await readHallState();
  return (
    <>
      <Masthead
        eyebrow="Orthosociety · Connect · Learn · Advance"
        title="International Conference"
        titleLine2="of Orthodontic Society 2027"
        place="Indonesia"
        mark={<PublicMark />}
      />
      <div className="app">
        <main id="main">
          <BookingApp initial={initial} />
        </main>
        <footer className="footer">International Conference of Orthodontic Society 2027 · ICOS · CC 2027</footer>
      </div>
    </>
  );
}
