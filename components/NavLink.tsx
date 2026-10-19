"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, badge, alert }: { href: string; children: React.ReactNode; badge?: number; alert?: boolean }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className={`navbtn${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
      <span>{children}</span>
      {badge !== undefined && <span className={`badge${alert && badge > 0 ? " alert" : ""}`}>{badge}</span>}
    </Link>
  );
}
