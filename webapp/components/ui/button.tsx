import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:   "bg-[#1A3A5C] text-white hover:bg-[#0D6B8E] shadow-sm",
        secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        ghost:     "bg-white/10 text-white hover:bg-white/20 border border-white/20",
        danger:    "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        link:      "text-[#0D6B8E] underline-offset-4 hover:underline",
      },
      size: {
        sm:  "h-8  px-3 text-xs",
        md:  "h-9  px-4",
        lg:  "h-11 px-6 text-base",
        icon:"h-9  w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
