/** @format */

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
        variant === "primary"
          ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
          : "border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700",
        className,
      )}
      {...props}
    />
  );
}
