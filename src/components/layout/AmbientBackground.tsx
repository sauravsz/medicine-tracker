"use client";

export function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(circle 600px at 90% -10%, rgba(255, 56, 92, 0.07) 0%, transparent 70%),
          radial-gradient(circle 600px at -10% 40%, rgba(99, 102, 241, 0.05) 0%, transparent 70%),
          radial-gradient(circle 700px at 80% 110%, rgba(2, 132, 199, 0.05) 0%, transparent 70%),
          #090c14
        `,
      }}
    />
  );
}
