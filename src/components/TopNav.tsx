"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopNavProps {
  showSearch?: boolean;
}

export default function TopNav({ showSearch = false }: TopNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/investigate", label: "Investigations" },
    { href: "/reports", label: "Reports" },
    { href: "/signals", label: "Signals" },
  ];

  return (
    <header className="bg-white border-b border-[#c6c6cd] flex items-center w-full h-16 px-8 shrink-0 z-50 sticky top-0">
      <div className="flex items-center gap-6 w-full max-w-[1440px] mx-auto">
        {/* Brand */}
        <Link href="/" className="font-bold text-[18px] text-black shrink-0 tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          RaderX
        </Link>

        {/* Search */}
        {showSearch && (
          <div className="flex items-center bg-[#f8fafc] border border-[#c6c6cd] rounded px-3 py-1.5 w-64">
            <svg className="w-4 h-4 text-[#76777d] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197A7.5 7.5 0 1 0 5.197 15.803L21 21z" />
            </svg>
            <input
              type="text"
              placeholder="Search insights..."
              className="bg-transparent border-none focus:outline-none text-sm text-[#0b1c30] w-full placeholder:text-[#76777d]"
            />
          </div>
        )}

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 ml-4 flex-1">
          {[
            { href: "/", label: "Dashboard" },
            { href: "/investigate", label: "Investigations" },
            { href: "/reports", label: "Reports" },
            { href: "/how-to-use", label: "How to Use" },
          ].map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium pb-1 transition-colors ${
                  isActive
                    ? "text-black border-b-2 border-black"
                    : "text-[#45464d] hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <Link
            href="/investigate"
            className="bg-black text-white text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            New Investigation
          </Link>
        </div>
      </div>
    </header>
  );
}
