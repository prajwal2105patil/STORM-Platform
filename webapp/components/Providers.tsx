"use client";

import { ThemeProvider } from "next-themes";
import { Screensaver }   from "@/components/ui/screensaver";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      {children}
      <Screensaver />
    </ThemeProvider>
  );
}
