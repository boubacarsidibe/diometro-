export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="welcome">
      <div className="auth-box">
        <div className="brand">DIO<span>METRO</span></div>
        {children}
      </div>
    </main>
  );
}
