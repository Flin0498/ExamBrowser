import Link from "next/link";
import { signOut } from "@/lib/auth";

export async function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white"
                aria-hidden
              >
                Ex
              </span>
              <span className="hidden text-sm font-semibold text-slate-900 sm:inline">Exam System</span>
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <p className="truncate text-sm font-medium text-slate-700">{title}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-ghost px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </div>
        {nav.length > 0 && (
          <nav className="border-t border-slate-100 bg-slate-50/80">
            <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
