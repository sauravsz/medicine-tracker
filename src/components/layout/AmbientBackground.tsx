"use client";

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Rausch Coral Glow Node (Top Right) */}
      <div className="absolute -top-32 -right-32 w-[550px] h-[550px] rounded-full bg-[#ff385c]/12 blur-[130px] animate-ambient-1" />

      {/* 2. Deep Indigo / Luxe Purple Node (Middle Left) */}
      <div className="absolute top-[35%] -left-32 w-[600px] h-[600px] rounded-full bg-[#6366f1]/10 blur-[150px] animate-ambient-2" />

      {/* 3. Cyan / Electric Teal Node (Bottom Right) */}
      <div className="absolute -bottom-40 right-[15%] w-[650px] h-[650px] rounded-full bg-[#0284c7]/10 blur-[160px] animate-ambient-3" />

      {/* Subtle Micro Noise Layer for Texture (Film grain / Apple Display Feel) */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
