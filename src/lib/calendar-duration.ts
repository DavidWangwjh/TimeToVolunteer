export function getEventDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function getDurationBucketClass(
  startTime: string,
  endTime: string,
  classPrefix: string
) {
  const durationMinutes = getEventDurationMinutes(startTime, endTime);

  if (durationMinutes < 90) return `${classPrefix}--short`;
  if (durationMinutes < 180) return `${classPrefix}--medium`;
  return `${classPrefix}--long`;
}
