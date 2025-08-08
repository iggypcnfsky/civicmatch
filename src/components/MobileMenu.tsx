"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
    const handler = () => setIsAuthed(localStorage.getItem("civicmatch.authenticated") === "1");
    window.addEventListener("civicmatch:auth-changed", handler);
    return () => window.removeEventListener("civicmatch:auth-changed", handler);
  }, []);

  if (!isAuthed) return null;

  return (
    <div className="md:hidden fixed top-3 right-3 z-50">
      <button
        aria-label="Open menu"
        className="rounded-md border border-divider bg-[color:var(--background)]/90 backdrop-blur px-3 py-2"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[80%] bg-[color:var(--background)] border-l border-divider shadow-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Menu</div>
              <button className="rounded-md border border-divider px-2 py-1" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[color:var(--muted)]/30"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="size-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-2 border-t border-divider">
              <button
                className="btn btn-muted w-full justify-center"
                onClick={() => {
                  localStorage.setItem("civicmatch.authenticated", "0");
                  window.location.href = "/";
                }}
              >
                <LogOut className="mr-2 size-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


