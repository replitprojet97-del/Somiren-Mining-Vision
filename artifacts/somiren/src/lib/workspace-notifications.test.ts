import assert from "node:assert/strict";
import test from "node:test";
import { localizeWorkspaceNotification } from "./workspace-notifications.ts";

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