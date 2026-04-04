import { createDAVClient } from "tsdav";

export interface RemindersList {
  url: string;
  displayName: string;
}

export interface AppleReminder {
  uid: string;
  url: string;
  etag: string;
  title: string;
  status: "NEEDS-ACTION" | "COMPLETED";
  due?: string; // ISO datum bijv. "2026-04-10"
  rawData: string;
}

// --- iCal parsing helpers ---

function unfoldIcal(data: string): string {
  // iCal-regels kunnen worden afgebroken met een newline + spatie/tab
  return data.replace(/\r?\n[ \t]/g, "");
}

function getIcalField(data: string, name: string): string | undefined {
  const unfolded = unfoldIcal(data);
  // Matcht bijv. "SUMMARY:..." of "DUE;TZID=...:..."
  const match = unfolded.match(new RegExp(`(?:^|\\n)${name}(?:;[^:\\n]*)?:([^\\n]*)`, "m"));
  return match?.[1]?.trim();
}

function parseIcalDate(raw: string): string | undefined {
  // Formaat: 20260410T140000Z of 20260410
  const digits = raw.replace(/T.*$/, "").replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return undefined;
}

function parseVTodo(data: string): Omit<AppleReminder, "url" | "etag" | "rawData"> | null {
  const uid = getIcalField(data, "UID");
  const summary = getIcalField(data, "SUMMARY");
  if (!uid || !summary) return null;

  const statusRaw = getIcalField(data, "STATUS");
  const status: "NEEDS-ACTION" | "COMPLETED" =
    statusRaw === "COMPLETED" ? "COMPLETED" : "NEEDS-ACTION";

  const dueRaw = getIcalField(data, "DUE");
  const due = dueRaw ? parseIcalDate(dueRaw) : undefined;

  return { uid, title: summary, status, due };
}

function buildCompletedIcal(rawData: string): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  let result = unfoldIcal(rawData);

  // Verwijder bestaande STATUS, PERCENT-COMPLETE en COMPLETED regels
  result = result.replace(/\nSTATUS:[^\n]*/g, "");
  result = result.replace(/\nPERCENT-COMPLETE:[^\n]*/g, "");
  result = result.replace(/\nCOMPLETED:[^\n]*/g, "");

  // Voeg toe vóór END:VTODO
  result = result.replace(
    "END:VTODO",
    `STATUS:COMPLETED\r\nCOMPLETED:${now}\r\nPERCENT-COMPLETE:100\r\nEND:VTODO`
  );

  return result;
}

// --- CalDAV client ---

async function getClient(email: string, password: string) {
  return createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: email, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

// Haal alle Reminders-lijsten op voor dit account
export async function fetchReminderLists(
  email: string,
  password: string
): Promise<RemindersList[]> {
  const client = await getClient(email, password);
  const calendars = await client.fetchCalendars();

  return calendars
    .filter((cal) => cal.components?.includes("VTODO"))
    .map((cal) => ({
      url: cal.url,
      displayName: cal.displayName ?? "Naamloos",
    }));
}

// Haal alle herinneringen op uit een specifieke lijst
export async function fetchReminders(
  email: string,
  password: string,
  listUrl: string
): Promise<AppleReminder[]> {
  const client = await getClient(email, password);

  const objects = await client.fetchCalendarObjects({
    calendar: { url: listUrl },
  });

  const reminders: AppleReminder[] = [];
  for (const obj of objects) {
    if (!obj.data) continue;
    const parsed = parseVTodo(obj.data);
    if (!parsed) continue;
    reminders.push({
      ...parsed,
      url: obj.url,
      etag: obj.etag ?? "",
      rawData: obj.data,
    });
  }

  return reminders;
}

// Markeer een specifieke herinnering als afgerond (via UID)
export async function completeReminderByUid(
  email: string,
  password: string,
  listUrl: string,
  uid: string
): Promise<boolean> {
  const client = await getClient(email, password);

  const objects = await client.fetchCalendarObjects({
    calendar: { url: listUrl },
  });

  const target = objects.find((obj) => {
    if (!obj.data) return false;
    const objUid = getIcalField(obj.data, "UID");
    return objUid === uid;
  });

  if (!target?.data) return false;

  const updatedData = buildCompletedIcal(target.data);

  await client.updateCalendarObject({
    calendarObject: {
      url: target.url,
      data: updatedData,
      etag: target.etag,
    },
  });

  return true;
}
