import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "VidForge AI", description: "AI-powered YouTube content creation and automation." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}