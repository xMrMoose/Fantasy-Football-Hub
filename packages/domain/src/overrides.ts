import type { ManualOverride } from "./types.js";

export class OverrideValidationError extends Error {}

/** Overrides must always carry a non-empty reason; the sync run should fail loudly rather than apply a silent, unexplained override. */
export function validateOverrides(overrides: ManualOverride[]): void {
  for (const o of overrides) {
    if (!o.reason || o.reason.trim().length === 0) {
      throw new OverrideValidationError(`Override ${o.id} on ${o.entityType}/${o.entityId} is missing a reason.`);
    }
    if (!o.actor || o.actor.trim().length === 0) {
      throw new OverrideValidationError(`Override ${o.id} on ${o.entityType}/${o.entityId} is missing an actor.`);
    }
  }
}

/** Applies an override's `after` value onto a plain object field, returning a new object. Never mutates raw/source data in place — callers apply overrides to a normalized copy, keeping the raw snapshot untouched. */
export function applyOverrideField<T extends object>(entity: T, override: ManualOverride): T {
  return { ...entity, [override.field]: override.after } as T;
}

export function overridesFor(
  overrides: ManualOverride[],
  entityType: ManualOverride["entityType"],
  entityId: string,
): ManualOverride[] {
  return overrides.filter((o) => o.entityType === entityType && o.entityId === entityId);
}
