/**
 * RBAC Permission System — Single Source of Truth
 *
 * Dual-mode permission checks:
 *   1. Django codename-based (primary) — e.g. "employees.view", "payroll.manage"
 *   2. Static matrix fallback (offline/local) — PERMISSIONS[role][module]
 *
 * The codenames align with the HiringNow Django platform's RBAC system.
 */

// ── Roles ──────────────────────────────────────────────────
export const ROLES = ["CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"] as const
export type Role = (typeof ROLES)[number]

/** Named constants for role values — use these instead of string literals */
export const Roles: Readonly<Record<Role, Role>> = {
  CEO: "CEO",
  HR: "HR",
  PAYROLL: "PAYROLL",
  TEAM_LEAD: "TEAM_LEAD",
  EMPLOYEE: "EMPLOYEE",
} as const

/**
 * Maps Django role slugs → EMS system roles.
 * Django's RBAC uses dynamic slug-based roles; we map them to our static enum.
 */
export const DJANGO_ROLE_MAP: Record<string, Role> = {
  admin: "CEO",
  ceo: "CEO",
  hr_manager: "HR",
  recruiter: "HR",
  hiring_manager: "HR",
  payroll_admin: "PAYROLL",
  team_lead: "TEAM_LEAD",
  employee: "EMPLOYEE",
  viewer: "EMPLOYEE",
  interviewer: "EMPLOYEE",
}

/**
 * Maps Module enum → Django feature flag key.
 * Used to check if a module is enabled for the tenant.
 * Modules not listed here are always enabled (e.g. DASHBOARD, SETTINGS).
 */
export const MODULE_FEATURE_FLAG: Partial<Record<string, string>> = {
  EMPLOYEES: "employees",
  PAYROLL: "payroll",
  ATTENDANCE: "attendance",
  LEAVES: "leave",
  PERFORMANCE: "performance",
  TRAINING: "training",
  RECRUITMENT: "recruitment",
  DOCUMENTS: "documents",
  ASSETS: "assets",
  TICKETS: "help_desk",
  ANNOUNCEMENTS: "announcements",
  REIMBURSEMENT: "reimbursement",
  WORKFLOWS: "workflows",
  TEAMS: "teams",
  FEEDBACK: "feedback",
  RESIGNATION: "resignation",
  REPORTS: "reports",
}

/**
 * Check if a module is enabled for the tenant based on feature flags.
 * Returns true if: no flags provided (default), no flag for this module, or flag is true.
 */
export function isModuleEnabled(module: string, featureFlags?: Record<string, boolean>): boolean {
  if (!featureFlags || Object.keys(featureFlags).length === 0) return true
  const flagKey = MODULE_FEATURE_FLAG[module]
  if (!flagKey) return true // No flag = always enabled (DASHBOARD, SETTINGS, etc.)
  return featureFlags[flagKey] !== false
}

// ── Modules ────────────────────────────────────────────────
export enum Module {
  EMPLOYEES = "EMPLOYEES",
  PAYROLL = "PAYROLL",
  TEAMS = "TEAMS",
  PERFORMANCE = "PERFORMANCE",
  FEEDBACK = "FEEDBACK",
  DASHBOARD = "DASHBOARD",
  REPORTS = "REPORTS",
  ATTENDANCE = "ATTENDANCE",
  LEAVES = "LEAVES",
  TRAINING = "TRAINING",
  ANNOUNCEMENTS = "ANNOUNCEMENTS",
  ASSETS = "ASSETS",
  DOCUMENTS = "DOCUMENTS",
  TICKETS = "TICKETS",
  RECRUITMENT = "RECRUITMENT",
  RESIGNATION = "RESIGNATION",
  ORGANIZATION = "ORGANIZATION",
  SETTINGS = "SETTINGS",
  WORKFLOWS = "WORKFLOWS",
  AGENT_TRACKING = "AGENT_TRACKING",
  REIMBURSEMENT = "REIMBURSEMENT",
}

// ── Actions ────────────────────────────────────────────────
export enum Action {
  VIEW = "VIEW",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  REVIEW = "REVIEW",
  ASSIGN = "ASSIGN",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
}

// ── Permission Matrix ──────────────────────────────────────
// Indexed as: PERMISSIONS[role][module] = Action[]
type PermissionMatrix = Record<Role, Partial<Record<Module, Action[]>>>

const { VIEW, CREATE, UPDATE, DELETE, REVIEW, ASSIGN, EXPORT, IMPORT } = Action
const FULL_CRUD: Action[] = [VIEW, CREATE, UPDATE, DELETE]
const FULL_CRUD_EX: Action[] = [VIEW, CREATE, UPDATE, DELETE, EXPORT, IMPORT]

export const PERMISSIONS: PermissionMatrix = {
  CEO: {
    // 1) Full CRUD modules
    [Module.TEAMS]:         [...FULL_CRUD, ASSIGN],
    [Module.EMPLOYEES]:     FULL_CRUD_EX,
    [Module.ORGANIZATION]:  FULL_CRUD,
    [Module.TRAINING]:      FULL_CRUD,
    [Module.ASSETS]:        [...FULL_CRUD, ASSIGN],
    [Module.ANNOUNCEMENTS]: FULL_CRUD,
    [Module.REPORTS]:       [...FULL_CRUD, EXPORT],
    [Module.WORKFLOWS]:     FULL_CRUD,
    [Module.AGENT_TRACKING]: FULL_CRUD,
    // 2) View-only: attendance, payroll (all employees' data)
    [Module.ATTENDANCE]:    [VIEW],
    [Module.FEEDBACK]:      [VIEW, CREATE],
    [Module.PAYROLL]:       [VIEW],
    // 3) View + approve: leaves, resignation
    [Module.LEAVES]:        [VIEW, UPDATE],
    [Module.RESIGNATION]:   [VIEW, UPDATE],
    // 4) View-only + template config: performance; provide + view: documents
    [Module.PERFORMANCE]:   [VIEW, UPDATE],
    [Module.DOCUMENTS]:     [VIEW, CREATE],
    // Other modules
    [Module.DASHBOARD]:     [VIEW],
    [Module.TICKETS]:       [VIEW, UPDATE],
    [Module.RECRUITMENT]:   FULL_CRUD,
    [Module.SETTINGS]:      [VIEW, UPDATE],
    [Module.REIMBURSEMENT]: [VIEW, CREATE],
  },

  HR: {
    // 1) Full CRUD modules
    [Module.TEAMS]:         [...FULL_CRUD, ASSIGN],
    [Module.EMPLOYEES]:     FULL_CRUD_EX,
    [Module.ORGANIZATION]:  FULL_CRUD,
    [Module.TRAINING]:      FULL_CRUD,
    [Module.ASSETS]:        [...FULL_CRUD, ASSIGN],
    [Module.ANNOUNCEMENTS]: FULL_CRUD,
    [Module.REPORTS]:       [...FULL_CRUD, EXPORT],
    [Module.WORKFLOWS]:     FULL_CRUD,
    [Module.AGENT_TRACKING]: FULL_CRUD,
    // 2) View-only: attendance, payroll (all employees' data)
    [Module.ATTENDANCE]:    [VIEW],
    [Module.FEEDBACK]:      [VIEW, CREATE],
    [Module.PAYROLL]:       [VIEW],
    // 3) View + approve: leaves, resignation
    [Module.LEAVES]:        [VIEW, UPDATE],
    [Module.RESIGNATION]:   [VIEW, UPDATE],
    // 4) View-only + template config: performance; provide + view: documents
    [Module.PERFORMANCE]:   [VIEW, UPDATE],
    [Module.DOCUMENTS]:     [VIEW, CREATE],
    // Other modules
    [Module.DASHBOARD]:     [VIEW],
    [Module.TICKETS]:       [VIEW, UPDATE],
    [Module.RECRUITMENT]:   FULL_CRUD,
    [Module.SETTINGS]:      [VIEW],
    [Module.REIMBURSEMENT]: [VIEW, CREATE],
  },

  PAYROLL: {
    [Module.EMPLOYEES]:     [],
    [Module.PAYROLL]:       FULL_CRUD_EX,
    [Module.TEAMS]:         [],
    [Module.PERFORMANCE]:   [],
    [Module.FEEDBACK]:      [],
    [Module.DASHBOARD]:     [VIEW],
    [Module.REPORTS]:       [VIEW, EXPORT],
    [Module.ATTENDANCE]:    [VIEW],
    [Module.LEAVES]:        [VIEW],
    [Module.TRAINING]:      [],
    [Module.ANNOUNCEMENTS]: [VIEW],
    [Module.ASSETS]:        [],
    [Module.DOCUMENTS]:     [VIEW],
    [Module.TICKETS]:       [],
    [Module.RECRUITMENT]:   [],
    [Module.RESIGNATION]:   [],
    [Module.ORGANIZATION]:  [],
    [Module.SETTINGS]:      [],
    [Module.WORKFLOWS]:     [],
    [Module.AGENT_TRACKING]: [],
    [Module.REIMBURSEMENT]: [VIEW, CREATE, UPDATE],
  },

  TEAM_LEAD: {
    [Module.EMPLOYEES]:     [],
    [Module.PAYROLL]:       [VIEW],
    [Module.TEAMS]:         [VIEW],
    [Module.PERFORMANCE]:   [VIEW, CREATE, REVIEW],
    [Module.FEEDBACK]:      [VIEW, CREATE],
    [Module.DASHBOARD]:     [VIEW],
    [Module.REPORTS]:       [],
    [Module.ATTENDANCE]:    [VIEW],
    [Module.LEAVES]:        [VIEW, UPDATE],
    [Module.TRAINING]:      [VIEW],
    [Module.ANNOUNCEMENTS]: [VIEW],
    [Module.ASSETS]:        [VIEW],
    [Module.DOCUMENTS]:     [VIEW],
    [Module.TICKETS]:       [VIEW, CREATE, UPDATE],
    [Module.RECRUITMENT]:   [],
    [Module.RESIGNATION]:   [VIEW],
    [Module.ORGANIZATION]:  [],
    [Module.SETTINGS]:      [],
    [Module.WORKFLOWS]:     [],
    [Module.AGENT_TRACKING]: [VIEW],
    [Module.REIMBURSEMENT]: [VIEW, CREATE],
  },

  EMPLOYEE: {
    [Module.EMPLOYEES]:     [],
    [Module.PAYROLL]:       [VIEW],
    [Module.TEAMS]:         [VIEW],
    [Module.PERFORMANCE]:   [VIEW],
    [Module.FEEDBACK]:      [VIEW, CREATE],
    [Module.DASHBOARD]:     [VIEW],
    [Module.REPORTS]:       [],
    [Module.ATTENDANCE]:    [VIEW, CREATE],
    [Module.LEAVES]:        [VIEW, CREATE],
    [Module.TRAINING]:      [VIEW],
    [Module.ANNOUNCEMENTS]: [VIEW],
    [Module.ASSETS]:        [VIEW],
    [Module.DOCUMENTS]:     [VIEW],
    [Module.TICKETS]:       [VIEW, CREATE, UPDATE],
    [Module.RECRUITMENT]:   [],
    [Module.RESIGNATION]:   [VIEW, CREATE],
    [Module.ORGANIZATION]:  [],
    [Module.SETTINGS]:      [],
    [Module.WORKFLOWS]:     [],
    [Module.AGENT_TRACKING]: [VIEW],
    [Module.REIMBURSEMENT]: [VIEW, CREATE],
  },
}

// ── Django Codename Mapping ────────────────────────────────
// Maps Module + Action → Django permission codename (e.g. "employees.view")
// These align with HiringNow's `apps.tenants.models.Permission` codenames.

/** Module name → Django module prefix mapping */
const DJANGO_MODULE_MAP: Record<string, string> = {
  EMPLOYEES: "employees",
  PAYROLL: "payroll",
  TEAMS: "teams",
  PERFORMANCE: "performance",
  FEEDBACK: "feedback",
  DASHBOARD: "dashboard",
  REPORTS: "reports",
  ATTENDANCE: "attendance",
  LEAVES: "leaves",
  TRAINING: "training",
  ANNOUNCEMENTS: "announcements",
  ASSETS: "assets",
  DOCUMENTS: "documents",
  TICKETS: "tickets",
  RECRUITMENT: "recruitment",
  RESIGNATION: "resignation",
  ORGANIZATION: "organization",
  SETTINGS: "settings",
  WORKFLOWS: "workflows",
  AGENT_TRACKING: "agent_tracking",
  REIMBURSEMENT: "reimbursement",
}

/** Action → Django action suffix mapping */
const DJANGO_ACTION_MAP: Record<string, string> = {
  VIEW: "view",
  CREATE: "manage",  // Django uses "manage" for create/update/delete
  UPDATE: "manage",
  DELETE: "manage",
  REVIEW: "review",
  ASSIGN: "assign",
  EXPORT: "export",
  IMPORT: "import",
}

/**
 * Convert Module + Action to a Django codename.
 * e.g. (Module.EMPLOYEES, Action.VIEW) → "employees.view"
 */
export function toCodename(module: Module, action: Action): string {
  const mod = DJANGO_MODULE_MAP[module] || module.toLowerCase()
  const act = DJANGO_ACTION_MAP[action] || action.toLowerCase()
  return `${mod}.${act}`
}

/**
 * Check permission via Django codenames (primary) with matrix fallback.
 * If userCodenames is provided, checks against those first.
 * Falls back to static PERMISSIONS matrix if codenames are unavailable.
 */
export function hasPermissionWithCodenames(
  role: string,
  module: Module,
  action: Action,
  userCodenames?: Set<string>
): boolean {
  // If user has Django codenames loaded, check those first
  if (userCodenames && userCodenames.size > 0) {
    const codename = toCodename(module, action)
    if (userCodenames.has(codename)) return true
    // Also check wildcard manage (covers create/update/delete)
    const mod = DJANGO_MODULE_MAP[module] || module.toLowerCase()
    if (userCodenames.has(`${mod}.manage`)) {
      if (action === Action.CREATE || action === Action.UPDATE || action === Action.DELETE) {
        return true
      }
    }
  }
  // Fallback: check static matrix
  return hasPermission(role, module, action)
}

/**
 * Check if user is a tenant admin (bypasses all permission checks).
 * Maps to Django's `is_tenant_admin` flag.
 */
export function isTenantAdmin(role: string): boolean {
  return role === Roles.CEO || role === Roles.HR
}

// ── Functional Role Helpers (client-safe) ──────────────────

/** Check module access via system role OR functional capabilities (frontend use) */
export function canAccessModuleEffective(
    role: string,
    module: Module,
    functionalCapabilities?: Record<string, string[]>
): boolean {
    if (canAccessModule(role, module)) return true
    if (functionalCapabilities) {
        const actions = functionalCapabilities[module]
        return Array.isArray(actions) && actions.length > 0
    }
    return false
}

// ── Helper Functions ───────────────────────────────────────

/** Check if a role has a specific permission on a module */
export function hasPermission(role: string, module: Module, action: Action): boolean {
  const r = role as Role
  return PERMISSIONS[r]?.[module]?.includes(action) ?? false
}

/** Check if a role can access a module at all (has any actions) */
export function canAccessModule(role: string, module: Module): boolean {
  const r = role as Role
  return (PERMISSIONS[r]?.[module]?.length ?? 0) > 0
}

/** Get all modules a role can access */
export function getModulesForRole(role: string): Module[] {
  const r = role as Role
  const rolePerms = PERMISSIONS[r]
  if (!rolePerms) return []
  return (Object.entries(rolePerms) as [Module, Action[]][])
    .filter(([, actions]) => actions.length > 0)
    .map(([mod]) => mod)
}

/** Check if a role is valid */
export function isValidRole(role: string): role is Role {
  return ROLES.includes(role as Role)
}

/** Check if a role has org-wide (admin) data visibility for a module */
export function hasAdminScope(role: string, module: Module): boolean {
  switch (role as Role) {
    case Roles.CEO:
    case Roles.HR:
      return true
    case Roles.PAYROLL:
      return module === Module.PAYROLL || module === Module.ATTENDANCE || module === Module.LEAVES || module === Module.REIMBURSEMENT
    default:
      return false
  }
}

// ── Data Scoping ───────────────────────────────────────────

export interface ScopeContext {
  role: string
  organizationId: string
  employeeId?: string
}

/**
 * Returns a scope filter for data isolation.
 * Used for employee-centric queries (employee list, attendance, leaves, etc.)
 * Django views call this via the permissions API; kept here for frontend query scoping.
 */
export function scopeEmployeeQuery(ctx: ScopeContext, module: Module): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: ctx.organizationId }

  switch (ctx.role as Role) {
    case Roles.CEO:
      return base

    case Roles.HR:
      // HR can see all employees except CEO records
      if (module === Module.EMPLOYEES) {
        return { ...base, user: { role: { not: Roles.CEO } } }
      }
      return base

    case Roles.PAYROLL:
      // Payroll gets full scope for payroll-related modules
      if (module === Module.PAYROLL || module === Module.ATTENDANCE || module === Module.LEAVES) {
        return base
      }
      // Block everything else
      return { ...base, id: "__NONE__" }

    case Roles.TEAM_LEAD:
      if (!ctx.employeeId) return { ...base, id: "__NONE__" }
      // Own data + direct reports (employees where managerId = this employee)
      return {
        ...base,
        OR: [
          { id: ctx.employeeId },
          { managerId: ctx.employeeId },
        ],
      }

    case Roles.EMPLOYEE:
      if (!ctx.employeeId) return { ...base, id: "__NONE__" }
      return { ...base, id: ctx.employeeId }

    default:
      return { ...base, id: "__NONE__" }
  }
}

/**
 * Returns a scope filter for entity queries scoped by employeeId field.
 * Used for payroll, attendance, leaves, etc. where the entity has an employeeId FK.
 * Django views call this via the permissions API; kept here for frontend query scoping.
 */
export function scopeEntityQuery(ctx: ScopeContext, module: Module): Record<string, unknown> {
  const base: Record<string, unknown> = { organizationId: ctx.organizationId }

  switch (ctx.role as Role) {
    case Roles.CEO:
      return base

    case Roles.HR:
      return base

    case Roles.PAYROLL:
      if (module === Module.PAYROLL || module === Module.ATTENDANCE || module === Module.LEAVES || module === Module.REIMBURSEMENT) {
        return base
      }
      return { ...base, id: "__NONE__" }

    case Roles.TEAM_LEAD:
      if (!ctx.employeeId) return { ...base, id: "__NONE__" }
      // Team lead sees own + direct reports' entities
      return {
        ...base,
        employee: {
          OR: [
            { id: ctx.employeeId },
            { managerId: ctx.employeeId },
          ],
        },
      }

    case Roles.EMPLOYEE:
      if (!ctx.employeeId) return { ...base, id: "__NONE__" }
      return { ...base, employeeId: ctx.employeeId }

    default:
      return { ...base, id: "__NONE__" }
  }
}
