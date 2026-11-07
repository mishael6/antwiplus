import type { SVGProps } from "react";

export function ArrowIcon({ direction = "up-right", className, ...props }: SVGProps<SVGSVGElement> & { direction?: "up-right" | "down-left" }) {
  const path = direction === "up-right" ? "M7 17 17 7M8 7h9v9" : "M17 7 7 17M16 17H7V8";
  return <svg className={`inline-arrow${className ? ` ${className}` : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={path} /></svg>;
}
