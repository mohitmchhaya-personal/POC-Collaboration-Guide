export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-brand-gold text-sm font-medium uppercase tracking-wide">
        SpreadBliss
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        SpreadBliss Collaboration Intelligence
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600">
        Discover and research potential nonprofit collaboration partners.
      </p>
      <section className="mt-10 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-700">
          The application scaffold is running. The chat interface will be
          added in a subsequent task.
        </p>
        <p className="mt-2 text-sm">
          Status: <span className="font-medium text-brand-blue">Ready</span>
        </p>
      </section>
    </main>
  );
}
