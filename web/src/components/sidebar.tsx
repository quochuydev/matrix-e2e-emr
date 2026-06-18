"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  HeartPulse,
  LayoutDashboard,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useMatrix } from "matrix-client/react";
import { isClinicUser, findClinicByUserId } from "@/lib/config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
};

export function Sidebar() {
  const { session } = useMatrix();
  const pathname = usePathname();
  const isClinic = isClinicUser(session?.userId);
  const clinic = findClinicByUserId(session?.userId);

  const nav: NavItem[] = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: (p) => p === "/",
    },
    // Clinic operators manage patients; patients view their clinics.
    isClinic
      ? {
          href: "/patients",
          label: "Patients",
          icon: Users,
          match: (p) => p.startsWith("/patients"),
        }
      : {
          href: "/clinics",
          label: "Clinics",
          icon: Building2,
          match: (p) => p.startsWith("/clinics"),
        },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <SidebarBrand />

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {nav.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-secure" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4">
          <SecurityCard />
        </div>
      </nav>

      <div className="border-t px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {isClinic ? "Clinic" : "Patient"}
        </div>
        <div className="mt-0.5 truncate text-sm" title={session?.userId ?? ""}>
          {isClinic ? (clinic?.name ?? "Clinic") : "Your account"}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {session?.userId ?? "—"}
        </div>
      </div>
    </aside>
  );
}

export function SidebarBrand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 px-4 py-4 focus-visible:outline-none",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm">
        <HeartPulse className="size-5" />
      </span>
      <span className="text-base font-semibold tracking-tight">
        Patient Records
      </span>
    </Link>
  );
}

function SecurityCard() {
  return (
    <div className="bg-brand-gradient rounded-xl p-4 text-white shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4" />
        <span className="text-sm font-semibold">End-to-end encrypted</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/85">
        Records are encrypted on this device. Only you and invited clinics can
        read them — not the server.
      </p>
    </div>
  );
}
