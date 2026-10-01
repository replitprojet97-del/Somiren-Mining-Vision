---
name: Render verification and publishing
description: Avoid confusing redundant Render services with the active production deployment, and treat GitHub pushes as potentially deploying production.
---

Verify Render service roles using registered custom domains and the API URL embedded in the published frontend, not service names or failed-deployment screenshots alone.

**Why:** The same Render workspace contains two similarly named API services. The service in the user's screenshots had failed updates, while another API served the live website successfully. Missing custom domains on an API did not imply that the website's Render account was lost.

**How to apply:** During external production investigations, cross-check the account's service list, custom domains, live deployment commits, and actual frontend routing. Keep account access, deployment health, and database contents as separate claims.

Compare the code at the active deployment's commit with local code before attributing an access-denied screen to account permissions.

**Why:** An active collaborator with valid workspace permissions was rejected by an older deployed administrator guard, while the local code already contained the correction. The old screen also presented unrelated loading failures as access denial.

**How to apply:** Check account status and permissions read-only, then inspect the active deployment's routing and authorization order. Do not grant administrator privileges or change valid permissions to compensate for a routing defect.

Treat a push to the linked GitHub main branch as a potential production deployment.

**Why:** Render's automatic deployment is enabled for the linked services. Synchronizing local work to GitHub is therefore not necessarily a non-deploying action.

**How to apply:** Recheck the current auto-deploy settings and obtain explicit permission before pushing changes that could update production. Never promise to synchronize the linked branch without deployment unless automatic deployment has been safely addressed.