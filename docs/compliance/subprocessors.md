# OrdinCore — Subprocessor List

> **DRAFT — verify each entry and keep current.** Under the DPA, the controller must be informed of
> subprocessors and material changes. Confirm each provider's role, location, and that a data
> processing agreement (DPA/SCCs where relevant) is in place. Replace **[PLACEHOLDER]**.

Last updated: 2026‑09‑04

| Subprocessor | Purpose | Personal data processed | Location / transfer | Safeguard |
|---|---|---|---|---|
| **Krystal Hosting Ltd** (AS12488) | Application & database hosting (VPS 185.116.215.178) | All platform data at rest/in transit | **London, UK** | UK — no international transfer; confirm hosting contract + security terms **[LINK]** |
| **Katapult Cloud** (SMTP `*.katapult.cloud`) | Transactional email (invites, password reset, notifications) | Recipient email, name, message content | **[CONFIRM REGION — likely UK/EU]** | DPA **[CONFIRM]**; note the current cert workaround (`SMTP_TLS_REJECT_UNAUTHORIZED=false`) should be resolved — see risk below |
| **OpenAI** (`OPENAI_API_KEY`, `NARRATIVE_API_KEY`) | Narrative/text generation features **[CONFIRM WHICH ARE LIVE]** | **Potentially special‑category** if identifiable inputs are sent — see DPIA R3 | **USA** (international transfer) | **REQUIRES** OpenAI DPA with zero‑retention + no‑training, **and** a UK IDTA/Addendum + transfer risk assessment — OR de‑identify inputs / disable feature |
| **Expo (EAS)** | Mobile app build & submission pipeline | Source/build metadata (not service‑user data) | USA | Standard EAS terms **[CONFIRM]**; no service‑user PII in builds |
| **Apple (App Store / TestFlight)** | iOS distribution to testers | Tester Apple IDs (managed by Apple) | USA/global | Apple developer terms |
| **Google (Play Console)** | Android distribution to testers | Tester Google accounts (managed by Google) | USA/global | Google Play terms |

## Action items
1. **OpenAI (highest priority):** confirm exactly which features call it and what data they send; then apply the DPIA R3 decision (de‑identify / DPA+IDTA / disable). Do not process identifiable special‑category data via OpenAI until closed.
2. **Katapult:** obtain/confirm DPA and region; fix the TLS certificate so `SMTP_TLS_REJECT_UNAUTHORIZED` can return to `true`.
3. Confirm a signed DPA is on file for every subprocessor and record the link/reference above.
4. Add a change‑notification process so the controller is told before a new subprocessor is added.
