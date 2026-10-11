import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EventLens — Webhook inspection for developers", template: "%s · EventLens" },
  description: "Capture, inspect, search, replay, and understand webhooks and API events. Inspect Ethereum transactions alongside your application activity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
