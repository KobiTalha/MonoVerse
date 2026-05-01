import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react';

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function Surface({
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cx('mv-surface', className)} {...props}>
      {children}
    </div>
  );
}

export function AccentButton({
  className,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={cx('mv-button', 'mv-button-accent', className)} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={cx('mv-button', 'mv-button-ghost', className)} {...props}>
      {children}
    </button>
  );
}

export function StatusPill({
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span className={cx('mv-pill', className)} {...props}>
      {children}
    </span>
  );
}

export function LabelValue({
  label,
  value,
  className
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cx('mv-label-value', className)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
