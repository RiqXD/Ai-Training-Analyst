import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg w-full">
        <div className="card-header">
          <h1 className="card-title">Guru Dashboard</h1>
        </div>
        <div className="card-content space-y-3">
          <p>Masuk ke halaman dashboard pengajar.</p>
          <Link href="/teachers" className="btn">Buka Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
