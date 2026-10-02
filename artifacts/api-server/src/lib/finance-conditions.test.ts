import assert from "node:assert/strict";
import test from "node:test";
import { CONDITIONS_VERIFICATION_NOTICE, conditionsReportError, conditionsReviewNotice } from "./finance-conditions";

test("reporting requires actual instructions and an unresolved financial record", () => {
  assert.equal(conditionsReportError("arrear", "open", "Consignes rédigées par l’admin"), null);
  assert.equal(conditionsReportError("arrear", "open", "  "), "Les consignes n’ont pas encore été communiquées.");
  for (const status of ["settled", "archived", "closed"]) assert.ok(conditionsReportError("arrear", status, "Consignes"));
  for (const status of ["paid", "sent", "versé", "payé", " PAID "]) assert.ok(conditionsReportError("salary", status, "Consignes"));
  assert.equal(conditionsReportError("salary", "Non versé", "Consignes"), null);
});

test("notices describe verification rather than approval or a banking operation", () => {
  assert.match(CONDITIONS_VERIFICATION_NOTICE, /vérification est en cours/);
  assert.match(CONDITIONS_VERIFICATION_NOTICE, /notification ou un message/);
  const acknowledged = conditionsReviewNotice("acknowledged", "Période personnalisée");
  assert.match(acknowledged.body, /Période personnalisée/);
  assert.match(acknowledged.body, /poursuit la vérification/);
  assert.equal(conditionsReviewNotice("declined", "Mai").title, "Signalement non validé");
});