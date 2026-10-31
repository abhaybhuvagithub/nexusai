import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NEXUS AI — Your AI workspace", description: "A unified workspace for AI conversations, research and agents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
