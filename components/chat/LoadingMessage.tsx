export function LoadingMessage() {
  return (
    <li role="status" className="flex items-center gap-2 text-sm text-neutral-600">
      <span>Researching potential partners…</span>
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:300ms]" />
      </span>
    </li>
  );
}
