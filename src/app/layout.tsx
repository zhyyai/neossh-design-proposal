import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Chakra_Petch,
  IBM_Plex_Mono,
  Fira_Code,
} from "next/font/google";
import { PrefsProvider } from "@/lib/prefs";
import "./globals.css";

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plexmono",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEOSSH — Post-Bastion Operations Fabric",
  description:
    "A single-file, GPU-rendered web SSH operations fabric. Real PTY terminals, keystroke audit, risk engine, tunnels and command broadcast — in the browser.",
};

export const viewport: Viewport = {
  themeColor: "#020604",
  width: "device-width",
  initialScale: 1,
};

const PREFS_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem("neossh:prefs")||"{}");var d=document.documentElement;d.dataset.mode=(p.mode==="light"||p.mode==="dark")?p.mode:"dark";d.dataset.lang=(p.lang==="zh"||p.lang==="en")?p.lang:"en";d.dataset.font=p.font||"jetbrains";}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${jbMono.variable} ${chakra.variable} ${plexMono.variable} ${firaCode.variable} bg-abyss font-mono text-zinc-200 antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
        <PrefsProvider>{children}</PrefsProvider>
      </body>
    </html>
  );
}
