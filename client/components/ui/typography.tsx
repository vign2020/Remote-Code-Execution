/** @format */

import { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function H1({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h1
      className={clsx(
        "text-4xl font-extrabold tracking-tight text-white sm:text-5xl",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function Paragraph({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p
      className={clsx(
        "max-w-3xl text-base leading-7 text-slate-300 sm:text-lg",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function Label({
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label
      className={clsx("block text-sm font-medium text-slate-300", className)}
      {...props}
    >
      {children}
    </label>
  );
}
