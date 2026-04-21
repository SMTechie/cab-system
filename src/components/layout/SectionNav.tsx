export interface SectionNavItem {
  href: string;
  label: string;
}

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  return (
    <div className="sticky top-20 z-20 mb-6 overflow-x-auto">
      <div className="inline-flex min-w-full items-center gap-2 rounded-full border border-border bg-card/80 p-2 shadow-glow backdrop-blur-xl">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-white/10 hover:bg-white/5 hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
