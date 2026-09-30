import { CircleNotchIcon } from '@phosphor-icons/react';

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <CircleNotchIcon
      role="status"
      aria-label="Loading"
      className={cn("size-5 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
