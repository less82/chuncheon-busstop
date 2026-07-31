import Link from 'next/link';

export function AppHeader({
  title,
  backHref,
  right,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-navy text-white">
      <div className="flex min-h-[60px] items-center gap-2 py-2 screen-x">
        {backHref && (
          <Link
            href={backHref}
            className="tap-feedback -ml-2 flex min-h-touch items-center rounded-xl px-2 text-base font-bold text-white/90"
          >
            뒤로
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight">{title}</h1>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
