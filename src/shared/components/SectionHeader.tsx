type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
};

export function SectionHeader({ title, eyebrow, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="label mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-normal text-ink md:text-3xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
