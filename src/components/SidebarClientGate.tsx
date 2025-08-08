"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function SidebarClientGate() {
  // Start hidden on both server and first client render to avoid hydration mismatch.
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("civicmatch.authenticated");
    setIsAuthed(stored === "1");
  }, []);

  if (!isAuthed) return <div className="hidden md:block md:w-0 md:min-w-0" aria-hidden="true" />;
  return <Sidebar />;
}


