import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AssignCollaboratorSalaryRecordBody, UpdateSalaryRecordBody,
  CreateCollaboratorArrearBody, CreateSenderServiceBody, UpdateSenderServiceBody,
} from "@workspace/api-zod";

const salary = { periodLabel: "Octobre 2026", salaryStatus: "Non versé", amount: "3250.50", currency: "EUR" };
test("salary creation requires an explicit precise amount and currency", () => {
  assert.equal(AssignCollaboratorSalaryRecordBody.safeParse(salary).success, true);
  assert.equal(AssignCollaboratorSalaryRecordBody.safeParse({ periodLabel: salary.periodLabel, salaryStatus: salary.salaryStatus }).success, false);
  for (const amount of ["-1", "1.999", "1000000000000", "", "not-money"]) {
    assert.equal(AssignCollaboratorSalaryRecordBody.safeParse({ ...salary, amount }).success, false);
  }
  assert.equal(AssignCollaboratorSalaryRecordBody.safeParse({ ...salary, amount: "0" }).success, true);
  assert.equal(AssignCollaboratorSalaryRecordBody.safeParse({ ...salary, currency: "euros" }).success, false);
});
test("salary edit can retain unknown legacy values and carry admin instructions", () => {
  assert.equal(UpdateSalaryRecordBody.safeParse({
    amount: null, currency: null, transferInstructions: "Contactez le service paie.",
    payrollServiceName: "Service paie", payrollServiceSignature: "Somiren S.A. · Paie",
  }).success, true);
  assert.equal(UpdateSalaryRecordBody.safeParse({ salaryStatus: "Non versé" }).success, true);
  assert.equal(UpdateSalaryRecordBody.safeParse({ transferRequestStatus: "acknowledged" }).success, true);
  assert.equal(UpdateSalaryRecordBody.safeParse({ transferRequestStatus: "pending" }).success, false);
});
test("arrears preserve their explicit amount and administered service branding", () => {
  const result = CreateCollaboratorArrearBody.parse({
    periodLabel: "Septembre 2026", amount: "1400.25", currency: "USD",
    communicatedReason: "Régularisation", transferInstructions: "Consignes de paie.",
    payrollServiceName: "Service comptabilité", payrollServiceSignature: "Somiren S.A.",
  });
  assert.equal(result.amount, "1400.25");
  assert.equal(result.payrollServiceName, "Service comptabilité");
  assert.equal(result.payrollServiceSignature, "Somiren S.A.");
});
test("service catalog validates persisted names, signatures and activation edits", () => {
  assert.equal(CreateSenderServiceBody.safeParse({ name: "Service HSE", signature: "Somiren S.A. · HSE" }).success, true);
  assert.equal(CreateSenderServiceBody.safeParse({ name: "" }).success, false);
  assert.equal(CreateSenderServiceBody.safeParse({ name: "a".repeat(121) }).success, false);
  assert.equal(CreateSenderServiceBody.safeParse({ name: "RH", signature: "a".repeat(501) }).success, false);
  assert.equal(UpdateSenderServiceBody.safeParse({ isActive: false }).success, true);
});