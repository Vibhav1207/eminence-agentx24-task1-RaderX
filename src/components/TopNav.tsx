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
        <Link href="/" className="font-bold text-[18px] text-black shrink-0 tracking-tight">
          Task 1
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
          {links.map((link) => {
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
          <button aria-label="Notifications" className="text-[#45464d] hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </button>
          <button aria-label="Settings" className="text-[#45464d] hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#e5eeff] border border-[#c6c6cd] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#45464d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
