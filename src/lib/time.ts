export function localToUtc(localTime: string): string {
  const [hours, minutes] = localTime.split(":").map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  const utcHours = now.getUTCHours().toString().padStart(2, "0");
  const utcMinutes = now.getUTCMinutes().toString().padStart(2, "0");
  return `${utcHours}:${utcMinutes}`;
}

export function utcToLocal(utcTime: string): string {
  const [hours, minutes] = utcTime.split(":").map(Number);
  const now = new Date();
  now.setUTCHours(hours, minutes, 0, 0);
  const localHours = now.getHours().toString().padStart(2, "0");
  const localMinutes = now.getMinutes().toString().padStart(2, "0");
  return `${localHours}:${localMinutes}`;
}

export function getTimezoneAbbr(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
