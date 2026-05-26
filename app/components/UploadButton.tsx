"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "uploading" | "error";

export default function UploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so the same file can be re-selected if needed
    e.target.value = "";

    setState("uploading");
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
      setState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const isUploading = state === "uploading";
  const isError = state === "error";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      <button
        onClick={() => !isUploading && inputRef.current?.click()}
        disabled={isUploading}
        title={isError ? errorMsg : "Upload a receipt"}
        className={`
          fixed bottom-20 md:bottom-6 right-6 z-30
          flex items-center gap-2
          h-14 rounded-full shadow-lg
          text-white text-sm font-semibold
          transition-all duration-200
          ${isError
            ? "bg-red-500 px-4"
            : isUploading
            ? "bg-blue-400 cursor-not-allowed px-5"
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
            <span className="text-xl leading-none">+</span>
            <span>Upload receipt</span>
          </>
        )}
      </button>
    </>
  );
}
