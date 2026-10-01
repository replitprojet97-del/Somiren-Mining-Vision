import type { Lang } from "@/i18n/translations";

type WorkspaceNotification = {
  title?: string | null;
  body?: string | null;
};

const TITLES: Record<string, readonly [string, string]> = {
  "New document assigned": ["Nouveau document attribué", "New document assigned"],
  "Nouveau document attribué": ["Nouveau document attribué", "New document assigned"],
  "New request": ["Nouvelle demande", "New request"],
  "Nouvelle demande": ["Nouvelle demande", "New request"],
  "Meeting scheduled": ["Réunion programmée", "Meeting scheduled"],
  "Réunion programmée": ["Réunion programmée", "Meeting scheduled"],
  "New message": ["Nouveau message", "New message"],
  "Nouveau message": ["Nouveau message", "New message"],
  "Visioconférence planifiée": ["Visioconférence planifiée", "Video conference scheduled"],
  "Visioconférence annulée": ["Visioconférence annulée", "Video conference cancelled"],
  "Nouvel arriéré communiqué": ["Nouvel arriéré communiqué", "New arrears communicated"],
};

function translateBody(body: string, title: string | null | undefined, lang: Lang): string {
  const templates: Array<{
    titles: readonly string[];
    pattern: RegExp;
    french: (authored: string) => string;
    english: (authored: string) => string;
  }> = [
    {
      titles: ["New document assigned", "Nouveau document attribué"],
      pattern: /^A document has been assigned: (.+)$/u,
      french: title => `Un document vous a été attribué : ${title}`,
      english: title => `A document has been assigned: ${title}`,
    },
    {
      titles: ["New request", "Nouvelle demande"],
      pattern: /^A request has been assigned: (.+)$/u,
      french: title => `Une demande vous a été attribuée : ${title}`,
      english: title => `A request has been assigned: ${title}`,
    },
    {
      titles: ["Meeting scheduled", "Réunion programmée"],
      pattern: /^You have been invited to (.+)\.$/u,
      french: title => `Vous êtes invité(e) à ${title}.`,
      english: title => `You have been invited to ${title}.`,
    },
    {
      titles: ["New message", "Nouveau message"],
      pattern: /^A conversation has been started: (.+)$/u,
      french: subject => `Une conversation a été créée : ${subject}`,
      english: subject => `A conversation has been started: ${subject}`,
    },
    {
      titles: ["New message", "Nouveau message"],
      pattern: /^You received a reply in: (.+)$/u,
      french: subject => `Vous avez reçu une réponse dans : ${subject}`,
      english: subject => `You received a reply in: ${subject}`,
    },
    {
      titles: ["Nouvel arriéré communiqué"],
      pattern: /^Un arriéré relatif à (.+) est disponible dans votre espace financier\.$/u,
      french: period => `Un arriéré relatif à ${period} est disponible dans votre espace financier.`,
      english: period => `Arrears for ${period} are available in your financial workspace.`,
    },
    {
      titles: ["Visioconférence planifiée"],
      pattern: /^Vous êtes invité\(e\) à la visioconférence « (.+) »\.$/u,
      french: title => `Vous êtes invité(e) à la visioconférence « ${title} ».`,
      english: title => `You are invited to the video conference “${title}”.`,
    },
    {
      titles: ["Visioconférence annulée"],
      pattern: /^Votre accès à la visioconférence « (.+) » a été révoqué\.$/u,
      french: title => `Votre accès à la visioconférence « ${title} » a été révoqué.`,
      english: title => `Your access to the video conference “${title}” has been revoked.`,
    },
  ];

  for (const template of templates) {
    if (!title || !template.titles.includes(title)) continue;
    const match = template.pattern.exec(body);
    if (match) return template[lang === "en" ? "english" : "french"](match[1]);
  }
  return body;
}

/** Translates only known system-generated notification templates; authored content is retained verbatim. */
export function localizeWorkspaceNotification(
  notification: WorkspaceNotification,
  lang: Lang,
): { title?: string | null; body?: string | null } {
  const title = notification.title;
  const body = notification.body;
  const titlePair = title == null ? undefined : TITLES[title];

  return {
    title: titlePair ? titlePair[lang === "en" ? 1 : 0] : title,
    body: body == null ? body : translateBody(body, title, lang),
  };
}