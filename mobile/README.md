# OrdinCore Mobile (Expo / React Native)

The point-of-care companion to the OrdinCore governance web app. It surfaces the same doctrine
the web enforces — **the system proposes, people decide, every decision carries a reason** — for
all four roles, and it reads the existing REST API (no new backend, bar one small convenience route).

## What's here

- **Auth** — password sign-in → session token in the device keychain (`expo-secure-store`);
  returning sessions are **locked** until biometric unlock (`expo-local-authentication`).
- **Offline-first capture** — a signal raised without a connection is queued on the device
  (`AsyncStorage`) and flushed automatically on reconnect (`@react-native-community/netinfo`).
- **Push** — registers an Expo push token against the backend notifications pipeline.
- **Role-based navigation** — the tab set adapts to the signed-in role:
  | Role | Tabs |
  |---|---|
  | Team Leader | Today · Actions · Alerts (+ Raise a signal) |
  | Registered Manager | Pipeline · Actions · Alerts (+ Promote, Close risk) |
  | Director | Assurance · Reviews · Alerts (+ Validate review) |
  | Responsible Individual | Assurance · Sign-off · Alerts |

## Run it

```bash
cd mobile
npx expo install        # reconciles native dep versions to the installed Expo SDK
npx expo start          # press i (iOS sim), a (Android), or scan with Expo Go
```

Point it at your API in `app.json` → `expo.extra.apiBaseUrl`, or at build time:

```bash
EXPO_PUBLIC_API_BASE_URL=https://work.ordincore.co.uk/api/v1 npx expo start
```

Sign in with the same accounts as the web (e.g. a Team Leader, `…/admin123`). The role on the
JWT decides which interface loads.

> **Simulator note:** iOS Simulator / Android Emulator can't do Face ID unless enrolled
> (Features → Face ID → Enrolled). Without hardware the app skips the lock screen.

## Endpoints it uses (all already live)

| Screen | Call |
|---|---|
| Login | `POST /auth/login` |
| Today / My actions | `GET /actions/my`, `PATCH /risks/:id/actions/:actionId/status` |
| Raise a signal | `POST /pulses` (queued when offline) |
| Signal detail | `GET /pulses/:id`, `GET /pulses/:id/context` |
| Alerts | `GET /notifications` |
| RM Pipeline | `GET /rm/counts`, `GET /rm/patterns`, `GET /rm/register?type=active` |
| RM Close risk | `POST /risks/:id/close` |
| Director | `GET /director/cross-site-heatmap`, `GET /weekly-reviews/service-rollup`, `POST /weekly-reviews/:id/validate` |
| RI | `GET /ri/assurance-summary`, `GET /weekly-reviews/rollup`, `POST /weekly-reviews/rollup/sign` |

### One convenience route added to the backend
`POST /api/rm/patterns/:id/promote  { reason }` — promotes a cluster to a risk server-side
(the server holds the cluster's data and enforces the promotion floor + provenance; the mobile
client only supplies the RM's reason). Added to `backend/src/services/rm5.service.ts`,
`rm5.controller.ts`, `rm5.routes.ts`.

## Notes / to confirm against the live schema
- The `signal_type` enum values — Raise-a-signal sends the theme as `category`/`governance_domain`
  (which drives clustering and every rule) and only sets `signal_type: 'Safeguarding'` for the
  safeguarding fast-path; everything else defaults to `'Concern'`. Widen if your enum has more.
- `GET /notifications` shape — the Alerts screen unwraps `data | data.notifications | data.items`
  defensively; adjust if your payload differs.
- This is a working MVP scaffold, not the final visual design; the palette mirrors the wireframe
  and is meant to be swapped for brand tokens in `src/theme/tokens.ts`.
