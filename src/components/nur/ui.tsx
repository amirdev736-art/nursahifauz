import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "success" | "danger" | "cool" | "neon";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-semibold tracking-tight transition-all active:scale-[0.97] disabled:opacity-40",
        variant === "primary" && "grad-warm text-primary-foreground shadow-[var(--shadow-pop)]",
        variant === "neon" &&
          "grad-cool text-primary-foreground shadow-[var(--shadow-pop)] ring-1 ring-accent/50",
        variant === "cool" && "grad-cool text-primary-foreground",
        variant === "soft" && "border border-border bg-secondary/70 text-secondary-foreground",
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
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 pb-2 text-[12px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="grad-cool h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
