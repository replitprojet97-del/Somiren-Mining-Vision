import assert from "node:assert/strict";
import test from "node:test";
import { localizeWorkspaceNotification } from "./workspace-notifications.ts";

test("condition reports and review notifications are translated without changing authored values", () => {
  const notifications = [
    {
      title: "Vérification en cours",
      body: "Votre signalement a été enregistré. La vérification est en cours. Vous recevrez une notification ou un message de l’administration.",
      english: "Your report has been recorded. Verification is in progress. You will receive a notification or message from the administration.",
    },
    {
      title: "Conditions signalées comme remplies",
      body: "Collaborateur test signale que les conditions sont remplies pour la période « Mai - Septembre ». Vérification requise.",
      english: "Collaborateur test reports that the conditions have been met for the period “Mai - Septembre”. Verification required.",
    },
    {
      title: "Signalement pris en compte",
      body: "Votre signalement pour la période « Mai - Septembre » a été pris en compte. L’administration poursuit la vérification et vous contactera si nécessaire.",
      english: "Your report for the period “Mai - Septembre” has been acknowledged. The administration is continuing verification and will contact you if necessary.",
    },
    {
      title: "Signalement non validé",
      body: "Votre signalement pour la période « Mai - Septembre » n’a pas été validé. Consultez les consignes ou contactez l’administration pour connaître la suite à donner.",
      english: "Your report for the period “Mai - Septembre” has not been accepted. Review the instructions or contact the administration about the next steps.",
    },
  ];
  for (const notification of notifications) {
    assert.equal(localizeWorkspaceNotification(notification, "fr").body, notification.body);
    assert.equal(localizeWorkspaceNotification(notification, "en").body, notification.english);
    assert.notEqual(localizeWorkspaceNotification(notification, "en").title, notification.title);
  }
  const authored = { title: "Message personnel", body: "Instructions rédigées par l’administrateur." };
  assert.deepEqual(localizeWorkspaceNotification(authored, "en"), authored);
});

test("localizes known English notification templates while preserving authored titles", () => {
  const result = localizeWorkspaceNotification({
    title: "New document assigned",
    body: "A document has been assigned: Rapport: phase 2 / équipe.",
  }, "fr");

  assert.deepEqual(result, {
    title: "Nouveau document attribué",
    body: "Un document vous a été attribué : Rapport: phase 2 / équipe.",
  });
});

test("localizes French arrears and video templates while retaining their captured content", () => {
  assert.deepEqual(localizeWorkspaceNotification({
    title: "Nouvel arriéré communiqué",
    body: "Un arriéré relatif à janvier–mars : phase II est disponible dans votre espace financier.",
  }, "en"), {
    title: "New arrears communicated",
    body: "Arrears for janvier–mars : phase II are available in your financial workspace.",
  });

  assert.deepEqual(localizeWorkspaceNotification({
    title: "Visioconférence annulée",
    body: "Votre accès à la visioconférence « Revue : Afrique/Europe » a été révoqué.",
  }, "en"), {
    title: "Video conference cancelled",
    body: "Your access to the video conference “Revue : Afrique/Europe” has been revoked.",
  });
});

test("leaves unrecognized notification text untouched", () => {
  const authored = {
    title: "Personal follow-up",
    body: "Please contact Marie about the file named New request.",
  };
  assert.deepEqual(localizeWorkspaceNotification(authored, "fr"), authored);

  assert.deepEqual(localizeWorkspaceNotification({
    title: "New message",
    body: "A user-authored message says: A conversation has been started: with our team.",
  }, "fr"), {
    title: "Nouveau message",
    body: "A user-authored message says: A conversation has been started: with our team.",
  });
  assert.deepEqual(localizeWorkspaceNotification({
    title: "Personal follow-up",
    body: "A document has been assigned: authored content",
  }, "fr"), {
    title: "Personal follow-up",
    body: "A document has been assigned: authored content",
  });
});