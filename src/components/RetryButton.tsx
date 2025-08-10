"use client";

export default function RetryButton() {
  return (
    <button
      onClick={() => typeof window !== 'undefined' && window.location.reload()}
      className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-[color:var(--background)]"
    >
      Retry
    </button>
  );
}


