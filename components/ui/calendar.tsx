"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption:
          "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center",
        button_previous:
          "absolute left-1 h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        button_next:
          "absolute right-1 h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-9 text-center text-[0.8rem] font-normal pb-1",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-full text-sm font-normal text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
        today:
          "[&>button]:ring-1 [&>button]:ring-primary/50 [&>button]:text-primary [&>button]:font-semibold",
        outside: "opacity-40",
        disabled: "opacity-30 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
