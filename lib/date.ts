import { formatDistanceToNow, parseISO } from "date-fns";

export function timeFromNow(utcISOString: string) {
  return formatDistanceToNow(
    parseISO(utcISOString.endsWith("Z") ? utcISOString : utcISOString + "Z"),
    { addSuffix: true }
  );
}
