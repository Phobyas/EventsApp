import type { Metadata } from "next";
import { AuthProvider } from "./providers";
import { NavBar } from "@/components/shared/nav-bar";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventify",
  description: "Event ticketing and management platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("Layout session:", !!session);
  } catch (error) {
    console.error("Layout error:", error);
  }

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <NavBar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
