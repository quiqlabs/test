export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Quiq<span className="text-amber-600">Image</span>
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Built by Quiq Labs
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/api/health"
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            API Health Check
          </a>
        </div>
      </div>
    </main>
  );
}
