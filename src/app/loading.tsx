// Shown automatically by Next.js while a route segment streams in.
export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
      <div className="h-full w-1/3 bg-primary rounded-full animate-[nav-slide_1s_ease-in-out_infinite]" />
      <style>{`
        @keyframes nav-slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(160%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
