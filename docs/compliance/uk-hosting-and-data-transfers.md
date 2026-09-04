# UK Hosting & International Data‑Transfer Position — OrdinCore

> **DRAFT — confirm each fact with the hosting owner and record contract references.** Replace **[PLACEHOLDER]**.

## Primary hosting (data at rest & in use)
- **Provider:** Krystal Hosting Ltd (AS12488). **Region: London, United Kingdom.**
- **Server:** VPS `185.116.215.178`, repo at `/var/www/ordincore`.
- **Components on‑server (UK):** Node/Express API, PostgreSQL database, Redis (job queue), and
  service‑user **evidence media** (`backend/storage/uploads`, authenticated access only).
- **Position:** the platform's personal data — including special‑category data — is **hosted in the
  UK**. Confirm the hosting agreement includes appropriate security and processing terms, and where
  backups are stored (must also be UK/appropriate). **[CONFIRM BACKUP DESTINATION + REGION]**

## Supporting services that may involve transfer
| Service | Data | Location | Transfer safeguard |
|---|---|---|---|
| Katapult (email) | email address, name, message content | **[CONFIRM — UK/EU expected]** | DPA; if EU, UK adequacy/Addendum **[CONFIRM]** |
| **OpenAI (narrative/AI)** | **potentially identifiable/special‑category** if enabled with real inputs | **USA** | **UK IDTA/Addendum + transfer risk assessment + DPA (zero‑retention, no‑training) REQUIRED — or de‑identify / disable.** See [DPIA](./DPIA.md) R3 |
| Expo/Apple/Google (mobile build & distribution) | build/account metadata, tester accounts — **no service‑user PII** | USA/global | vendor terms |

## Actions
1. **Confirm the backup destination and its region** (must be UK or covered by an appropriate safeguard).
2. **Resolve the OpenAI transfer** before any additional provider enters identifiable data.
3. Record hosting/contract references and review annually or on any change of region/provider.
