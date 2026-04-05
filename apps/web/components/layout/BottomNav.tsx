"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, BarChart3, Shield, MoreHorizontal } from "lucide-react";

const tabs = [
  { href: "/assets", icon: Building2, label: "資產" },
  { href: "/transactions", icon: BarChart3, label: "收支" },
  { href: "/dashboard", icon: Home, label: "儀表板" },
  { href: "/insurance", icon: Shield, label: "保險" },
  { href: "/more", icon: MoreHorizontal, label: "更多" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-[#e5e5ea] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-[#007aff]" : "text-[#c7c7cc]"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
