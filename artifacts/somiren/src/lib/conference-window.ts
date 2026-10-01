export type ConferenceMeeting = {
  id: number;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  videoAssetId?: number | null;
};

export function conferenceWindow(meeting: ConferenceMeeting, now = Date.now()): "scheduled" | "active" | "ended" {
  const start = new Date(meeting.startsAt).getTime();
  const end = meeting.endsAt ? new Date(meeting.endsAt).getTime() : start + 24 * 60 * 60 * 1_000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || now > end) return "ended";
  return now < start ? "scheduled" : "active";
}