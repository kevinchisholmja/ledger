"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import TransactionEntryForm from "./TransactionEntryForm";

type UploadState = "idle" | "uploading" | "error";

export default function UploadButton() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (pathname === "/login") return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadState("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      router.push("/review");
      router.refresh();
      setUploadState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
      setTimeout(() => setUploadState("idle"), 4000);
    }
  }

  const isUploading = uploadState === "uploading";
  const isError = uploadState === "error";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      {/* Click-away backdrop for menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Two-option menu */}
      {menuOpen && !isUploading && (
        <div className="fixed bottom-40 md:bottom-24 right-6 z-30 flex flex-col gap-2 items-end">
          <button
            onClick={() => { setMenuOpen(false); setShowForm(true); }}
            className="flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="text-base leading-none">✏️</span>
            Add manually
          </button>
          <button
            onClick={() => { setMenuOpen(false); inputRef.current?.click(); }}
            className="flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="text-base leading-none">📎</span>
            Upload receipt
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          if (!isUploading) setMenuOpen((o) => !o);
        }}
        disabled={isUploading}
        title={isError ? errorMsg : "Add a transaction"}
        className={`
          fixed bottom-24 md:bottom-6 right-6 z-30
          flex items-center gap-2
          h-14 rounded-full shadow-lg
          text-white text-sm font-semibold
          transition-all duration-200
          ${isError
            ? "bg-red-500 px-4"
            : isUploading
            ? "bg-blue-400 cursor-not-allowed px-5"
            : menuOpen
            ? "bg-blue-700 px-5"
            : "bg-blue-600 hover:bg-blue-500 active:scale-95 px-5"
          }
        `}
      >
        {isUploading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
            <span>Processing…</span>
          </>
        ) : isError ? (
          <>
            <span className="text-base leading-none">!</span>
            <span className="max-w-[180px] truncate">{errorMsg}</span>
          </>
        ) : (
          <>
            <span className="text-xl leading-none">{menuOpen ? "×" : "+"}</span>
            <span>Add</span>
          </>
        )}
      </button>

      {showForm && (
        <TransactionEntryForm onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
