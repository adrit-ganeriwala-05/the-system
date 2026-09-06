/**
 * A section boundary that carries its own label.
 *
 * The label attaches to the rule at a notch, so sections never need a tracked-out caps
 * eyebrow floating above them — that pattern is the tell of a templated layout.
 */
export default function Divider({
  label,
  right,
}: {
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-0" aria-hidden={false}>
      <span className="rule h-px w-6 shrink-0" />
      <span className="ink-3 text-[11px]" aria-hidden>
        ◦
      </span>
      <h2 className="label shrink-0 lowercase">{label}</h2>
      <span className="rule h-px flex-1" />
      {right && <span className="label shrink-0 normal-case">{right}</span>}
    </div>
  );
}
