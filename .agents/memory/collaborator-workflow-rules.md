---
name: Collaborator workflow requirements
description: User-defined distinctions for document returns and direct access to arrears details.
---

“Marquer traité” means updating the processing status, not returning a modified file to the Direction. A return must attach the completed or signed file, allow an optional comment, notify the Direction, preserve the original, and show the return date.

**Why:** The user explicitly identified the ambiguity between completing work locally and transmitting the result.

**How to apply:** Keep evidence of actual file transmission separate from a processing-status change. Never imply that marking a document processed sends a file.

The arrears card in the financial overview must open the existing financial-details modal directly, like the salary-status card. Do not add an intermediate expanded list or require the “Arriérés & Régularisations” tab. Highlight the card and include a short, clear attention note.

**Why:** The user corrected an overly broad interpretation: “Afficher ce modal pour les arrieres. Nul besoin de passer par ‘arrierés et regularisation’. C'est tout ce que je demandais.”

**How to apply:** Reuse the existing details interaction from the overview. Keep financial data and instructions from the administration; screenshot examples are not live-data replacements.

The supplied financial-modal screenshots show production test records filled in through the admin interface. Their “Motif” and “Consignes” content must not be copied into code, defaults, or seed data.

**Why:** The user explicitly clarified that these texts were entered côté admin and that the screenshots are a visual reference only.

**How to apply:** Render the selected record’s administrator-supplied content dynamically; change the modal’s access or presentation without changing its data.