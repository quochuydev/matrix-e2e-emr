"use client";

import { useEffect } from "react";
import { useMatrix } from "matrix-client/react";
import { useT } from "@/lib/i18n";
import { SignIn } from "./sign-in";
import { StatusBar } from "./status-bar";
import { Sidebar, SidebarBrand } from "./sidebar";
import { FullPageLoader } from "./full-page-loader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, session, error, pendingBackup } = useMatrix();
  const t = useT();

  useEffect(() => {
    if (pendingBackup <= 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingBackup]);

  if (status === "initializing") {
    return <FullPageLoader />;
  }

  if (status === "connecting") {
    return <FullPageLoader label={t("shell.connecting")} />;
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="text-destructive font-medium">
          {t("shell.connectError")}
        </div>
        <div className="text-sm text-muted-foreground max-w-md text-center break-words">
          {error ?? t("shell.unknownError")}
        </div>
        <SignIn />
      </div>
    );
  }

  if (!session || status !== "ready") {
    return <SignIn />;
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-8">
            <SidebarBrand className="-ml-1 px-0 py-0 md:hidden" />
            <div className="min-w-0 flex-1">
              <StatusBar />
            </div>
          </div>
        </header>
        <main className="w-full flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
