import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '../lib/classNames';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button = ({
  icon,
  variant = 'secondary',
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={classNames(
      'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-40',
      variant === 'primary' &&
        'border-ink-950 bg-ink-950 text-white hover:bg-ink-800',
      variant === 'secondary' &&
        'border-neutral-300 bg-white text-ink-950 hover:bg-neutral-50',
      variant === 'ghost' &&
        'border-transparent bg-transparent text-ink-600 hover:bg-neutral-100 hover:text-ink-950',
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);
