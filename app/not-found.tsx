import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app">
      <main id="main">
        <section className="panel form-panel">
          <h1 className="panel-title">Page not found</h1>
          <p className="hint">
            <Link href="/">Back to International Conference of Orthodontic Society 2027</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
