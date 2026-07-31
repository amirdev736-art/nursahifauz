import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "success" | "danger" | "cool";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50",
        variant === "primary" && "grad-warm text-primary-foreground shadow-[var(--shadow-pop)]",
        variant === "cool" && "grad-cool text-accent-foreground",
        variant === "soft" && "bg-secondary text-secondary-foreground",
        variant === "ghost" && "bg-transparent text-muted-foreground",
        variant === "success" && "bg-success text-success-foreground",
        variant === "danger" && "bg-destructive text-destructive-foreground",
        className,
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ios-card p-5", className)}>{children}</div>;
}

export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="ios-card flex flex-col items-center gap-1 px-2 py-4">
      <span className={cn("text-2xl font-bold tabular-nums", tone)}>{value}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 pb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="grad-warm h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
