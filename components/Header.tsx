// During the private CIPD pilot there is no account system and no live
// payment, so the "Free account" and "Full member" controls are hidden
// rather than left as dead buttons. Set NEXT_PUBLIC_PILOT_MODE=false once
// accounts and payment are built and ready for public launch.
const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE !== "false";

export function Header({ savedCount }: { savedCount: number }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm text-white">
          RL
        </span>
        ReferenceLib
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost">Saved {savedCount}</button>
        {PILOT_MODE ? (
          <span className="badge">Private pilot · free for all CIPD students</span>
        ) : (
          <>
            <button className="btn">Free account</button>
            <button className="btn btn-primary">Full member · R599/yr</button>
          </>
        )}
      </div>
    </header>
  );
}
