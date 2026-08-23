export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-12 w-auto animate-pulse" />
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/3 rounded-full bg-[#2200ff] animate-[indeterminate_1.8s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
