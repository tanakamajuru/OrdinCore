# Access control & least privilege — OrdinCore

> DSPT Standard 4. Owner: **[NEEDS INPUT]**. Review: access list reviewed **quarterly**; policy
> annually.

## Principle

Everyone gets the **least access needed** for their role, and only to the services (houses) they are
assigned to. Access is enforced in code, not by convention.

## How access is controlled

- **Role-based access control (RBAC)** — each API route is gated to specific roles via
  `requireRole(...)` ([../../backend/src/middleware/role.middleware.ts](../../../backend/src/middleware/role.middleware.ts)).
  Roles: Support Worker, Team Leader, Registered Manager, Director, Responsible Individual, Admin,
  Super Admin.
- **Service/house scope** — operational roles are restricted to their assigned houses via
  `requireScope` ([../../backend/src/middleware/scope.middleware.ts](../../../backend/src/middleware/scope.middleware.ts)).
- **Tenant isolation** — every record is scoped to its `company_id`
  ([../../backend/src/middleware/tenant.middleware.ts](../../../backend/src/middleware/tenant.middleware.ts));
  no cross-provider access is possible.
- **Authentication** — JWT verified on every request; MFA required for privileged roles.

## Joiners, movers, leavers

- **Joiner**: account created with the minimum role; house assignments set explicitly; signs the
  [staff responsibilities](./staff-data-security-responsibilities.md) policy before access.
- **Mover**: role/house changes are applied promptly when notified; old access removed.
- **Leaver**: access **disabled on the last working day**; confirmed by **[NEEDS INPUT]**.

## Access reviews

- A **quarterly access review** confirms who has access, their role, and that admin/privileged
  accounts are still required. Outcome recorded by **[NEEDS INPUT]** with the date.
- Admin/Super-Admin accounts are kept to the minimum number necessary and named.

## Database

- The application connects as a **least-privilege DB role** (not the Postgres superuser). `audit_logs`
  is append-only to the application role (see [../../operations/audit-log-integrity.md](../../operations/audit-log-integrity.md)).
