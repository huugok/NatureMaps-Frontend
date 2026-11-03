interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-[46px] shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:top-[3px] after:left-[3px] after:size-[22px] after:rounded-full after:bg-surface after:shadow-raised after:transition-transform aria-checked:bg-accent aria-checked:after:translate-x-[18px]"
    />
  )
}
