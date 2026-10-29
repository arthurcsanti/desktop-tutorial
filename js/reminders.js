// Lembretes no iPhone, sem servidor:
//  - app Lembretes: via um Atalho ("Lastro Lembrete") que recebe os dados e cria o lembrete
//  - app Calendário: arquivo .ics com eventos que se repetem e alerta no dia anterior

export const SHORTCUT_NAME = 'Lastro Lembrete';

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const icsDay = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** próxima data em que o dia `day` acontece (mensal) ou `day/month` (anual) */
export function nextDate(day, month) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const clampDay = (y, m) => Math.min(day, new Date(y, m + 1, 0).getDate());
  if (month) {
    let d = new Date(now.getFullYear(), month - 1, clampDay(now.getFullYear(), month - 1));
    if (d < now) d = new Date(now.getFullYear() + 1, month - 1, clampDay(now.getFullYear() + 1, month - 1));
    return d;
  }
  let d = new Date(now.getFullYear(), now.getMonth(), clampDay(now.getFullYear(), now.getMonth()));
  if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, clampDay(now.getFullYear(), now.getMonth() + 1));
  return d;
}

/**
 * Um lembrete: { title, notes, day, month?, repeat: 'monthly' | 'yearly' | 'none', date? }
 * date (AAAA-MM-DD) é usado quando repeat = 'none'.
 */
export function shortcutURL(r) {
  const when = r.date ? new Date(`${r.date}T09:00:00`) : nextDate(r.day, r.month);
  const payload = {
    titulo: r.title,
    data: `${isoDay(when)} 09:00`,
    notas: r.notes || '',
    repetir: r.repeat === 'yearly' ? 'anual' : r.repeat === 'monthly' ? 'mensal' : 'não',
    lista: 'Finanças',
  };
  return `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(JSON.stringify(payload))}`;
}

const escICS = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
// linhas do iCalendar têm no máximo 75 octetos
const fold = (line) => {
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = ' '; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
};

export function ics(reminders) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = reminders.map((r, i) => {
    const d = r.date ? new Date(`${r.date}T12:00:00`) : nextDate(r.day, r.month);
    const end = new Date(d); end.setDate(end.getDate() + 1);
    const rule = r.repeat === 'monthly' ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${Math.min(r.day, 28) === r.day ? r.day : -1}`
      : r.repeat === 'yearly' ? 'RRULE:FREQ=YEARLY' : null;
    return [
      'BEGIN:VEVENT',
      `UID:lastro-${stamp}-${i}@lastro.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDay(d)}`,
      `DTEND;VALUE=DATE:${icsDay(end)}`,
      rule,
      `SUMMARY:${escICS(r.title)}`,
      r.notes ? `DESCRIPTION:${escICS(r.notes)}` : null,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(r.title)}`, 'TRIGGER:-PT15H', 'END:VALARM',
      'END:VEVENT',
    ].filter(Boolean).map(fold).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lastro//Financas//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Lastro', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Abre o .ics: no iPhone o Calendário mostra "Adicionar todos". */
export async function openCalendar(reminders, filename = 'lastro-lembretes.ics') {
  const text = ics(reminders);
  if (isIOS()) {
    // o Safari entrega data:text/calendar direto para o Calendário
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(text)}`;
    return;
  }
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function openShortcut(r) {
  window.location.href = shortcutURL(r);
}
