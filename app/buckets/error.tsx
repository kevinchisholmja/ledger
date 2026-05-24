"use client";

export default function ReviewError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-white font-medium">Failed to load review queue</p>
        <button onClick={reset} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
          Try again
        </button>
      </div>
    </div>
  );
}
