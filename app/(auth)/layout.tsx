export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #FFEAD0 0%, #F2E8DC 32%, #DDE6F7 68%, #C9DDFA 100%)",
      }}
    >
      {children}

      <p className="text-xs mt-8" style={{ color: "#9A8F84" }}>
        © {new Date().getFullYear()} Nerve
      </p>
    </div>
  );
}
