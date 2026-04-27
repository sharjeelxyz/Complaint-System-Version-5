export default function StatusBadge({ status }) {
  const map = {
    pending:     { cls: 'badge-slate',  dot: 'bg-slate-400',   label: 'Pending'     },
    in_progress: { cls: 'badge-yellow', dot: 'bg-amber-500',   label: 'In Progress' },
    completed:   { cls: 'badge-green',  dot: 'bg-emerald-500', label: 'Completed'   },
    rejected:    { cls: 'badge-red',    dot: 'bg-red-500',     label: 'Rejected'    },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}
