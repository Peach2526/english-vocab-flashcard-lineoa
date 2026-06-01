export function bangkokDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parts.hour,
    minute: parts.minute
  };
}

export function resolveSlot(explicitSlot, date = new Date()) {
  if (explicitSlot === '08:00' || explicitSlot === '12:00') {
    return explicitSlot;
  }

  const { hour } = bangkokDateParts(date);
  return Number(hour) < 10 ? '08:00' : '12:00';
}

export function windowKey(slot, date = new Date()) {
  const parts = bangkokDateParts(date);
  return `${parts.date}T${slot}+07:00`;
}

export function lineHeader(slot) {
  return `\u{1F4D8} English Vocabulary Flashcards \u2014 ${slot}`;
}
