"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "antwiplus-admin-sidebar-collapsed";

export function AdminSidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === "true";
    setCollapsed(saved);
    document.querySelector(".admin-shell")?.classList.toggle("sidebar-collapsed", saved);
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
    document.querySelector(".admin-shell")?.classList.toggle("sidebar-collapsed", next);
  }

  return <button
    className="admin-sidebar-toggle"
    type="button"
    onClick={toggleSidebar}
    aria-label={collapsed ? "Expand side navigation" : "Collapse side navigation"}
    aria-expanded={!collapsed}
    aria-controls="admin-side-navigation"
    title={collapsed ? "Expand navigation" : "Collapse navigation"}
  ><span aria-hidden="true">{collapsed ? "»" : "«"}</span></button>;
}
