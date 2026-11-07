import { SiteFooter, SiteHeader } from "@/components/LegalLayout";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteHeader />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
