"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-2xl mb-3">⚠️</p>
        <p className="text-white font-medium">Something went wrong</p>
        <p className="text-sm text-zinc-400 mt-1">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
