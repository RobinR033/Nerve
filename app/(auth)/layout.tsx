export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Linker paneel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF4800] flex-col justify-between p-12 relative overflow-hidden">
        {/* Achtergrond decoratie */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#FF6B2B] opacity-50" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#E03E00] opacity-60" />
        <div className="absolute top-1/2 right-12 w-48 h-48 rounded-full bg-[#FF6B2B] opacity-30" />

        {/* Logo */}
        <div className="relative z-10">
          <span className="text-white font-display text-2xl font-bold tracking-tight">
            Nerve
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-4">
            Jouw zenuwcentrum
          </p>
          <h1 className="text-white font-display text-5xl font-bold leading-tight">
            Elke dag de
            <br />
            juiste dingen
            <br />
            doen.
          </h1>
          <p className="text-white/70 mt-6 text-lg leading-relaxed max-w-sm">
            Capture snel. Focus scherp. Nerve denkt mee.
          </p>
        </div>

        {/* Bodem */}
        <div className="relative z-10">
          <p className="text-white/40 text-sm">© 2026 Nerve</p>
        </div>
      </div>

      {/* Rechter paneel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-12">
          <span className="text-[#FF4800] font-display text-2xl font-bold">
            Nerve
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
