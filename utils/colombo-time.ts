const COLOMBO_TIME_ZONE = "Asia/Colombo";

function getFormatterParts(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: COLOMBO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getColomboDateKey(date: Date = new Date()) {
  const parts = getFormatterParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  return `${year}-${month}-${day}`;
}

export function getColomboMinutes(date: Date = new Date()) {
  const parts = getFormatterParts(date);
  const hours = Number(getPart(parts, "hour"));
  const minutes = Number(getPart(parts, "minute"));
  return hours * 60 + minutes;
}

export function parseDateKeyToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
