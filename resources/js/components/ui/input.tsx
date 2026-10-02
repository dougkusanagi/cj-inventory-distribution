import * as React from "react"

import { cn } from "@/lib/utils"

/** Superfície, borda e estados compartilhados por todos os campos de formulário. */
const fieldSurfaceClassName =
  "rounded-2xl border border-input bg-field text-foreground shadow-field outline-none transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-muted-foreground hover:bg-field-hover focus-visible:border-highlight focus-visible:bg-field-focus focus-visible:ring-4 focus-visible:ring-ring/15 aria-expanded:border-highlight aria-expanded:bg-field-focus aria-expanded:ring-4 aria-expanded:ring-ring/15 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 dark:aria-invalid:ring-destructive/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input disabled:hover:bg-field motion-reduce:transition-none"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldSurfaceClassName,
        "file:text-foreground placeholder:text-muted-foreground caret-highlight selection:bg-primary selection:text-primary-foreground flex h-12 w-full min-w-0 px-4 py-2 text-base file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input, fieldSurfaceClassName }
