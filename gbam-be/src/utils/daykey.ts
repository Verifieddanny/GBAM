import { DateTime } from "luxon";

// always use Africa, Lagos time for day boundaries
export function todayKey(): string {
  return DateTime.now().setZone("Africa/Lagos").toFormat("yyyy-LL-dd");
}