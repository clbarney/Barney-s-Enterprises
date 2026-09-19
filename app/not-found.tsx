import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      <h1 className="text-4xl font-extrabold mb-2">404 - Page Not Found</h1>
      <p className="text-slate-400 mb-4">The requested page could not be found.</p>
      <Link href="/" className="px-4 py-2 bg-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-500 transition">
        Return Home
      </Link>
    </div>
  );
}
