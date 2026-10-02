import { db, senderServicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Snapshot the service at send time; later catalog edits do not change old messages. */
export async function resolveSenderService(id?: number) {
  if (id === undefined) return { senderServiceName: "La direction", senderServiceSignature: "Somiren S.A. · Direction générale" };
  const [service] = await db.select().from(senderServicesTable).where(eq(senderServicesTable.id, id)).limit(1);
  if (!service?.isActive) return null;
  return { senderServiceName: service.name, senderServiceSignature: service.signature };
}

export function serviceAudioDownloadName(name: string, originalFileName: string) {
  const extension = originalFileName.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
  return `${name.replace(/[/\\\u0000-\u001f\u007f]/g, "-")}${extension}`;
}