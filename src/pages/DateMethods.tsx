import { format } from "date-fns";

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";

export function getWeeksInMonth(currentMonth: Date) {
  const start = startOfWeek(startOfMonth(currentMonth));
  const end = endOfWeek(endOfMonth(currentMonth));

  const weeks: Date[][] = [];
  let day = start;
  let week: Date[] = [];

  while (day <= end) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    day = addDays(day, 1);
  }

  return weeks;
}
