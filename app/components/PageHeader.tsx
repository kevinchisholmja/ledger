import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  right,
  backHref = "/",
}: {
  title: string;
  right?: ReactNode;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-sm md:px-8">
      <Link
        href={backHref}
        aria-label="Back"
        className="text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="text-base font-semibold">{title}</h1>
      {right && <div className="ml-auto flex items-center gap-3">{right}</div>}
    </header>
  );
}
