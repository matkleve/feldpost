#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ALLOWED_STATUS = new Set([
  "planned",
  "draft",
  "stable",
  "deprecated",
  "replaced",
]);
const ALLOWED_STATES = new Set([
  "default",
  "hover",
  "active",
  "focus-visible",
  "disabled",
  "read-only",
  "loading",
  "error",
  "success",
]);
const ALLOWED_RESPONSIVE = new Set([
  "fixed",
  "fluid",
  "collapse",
  "drawer",
  "sheet",
]);
const ALLOWED_IMPACT = new Set(["critical", "high", "medium", "low"]);

const projectRoot = process.cwd();
const registryPath = resolve(
  projectRoot,
  "docs",
  "design-system",
  "registry.json",
);
const schemaPath = resolve(
  projectRoot,
  "docs",
  "design-system",
  "registry.schema.json",
);

const errors = [];

function pushError(path, message) {
  errors.push(`${path}: ${message}`);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path) {
  if (!existsSync(path)) {
    pushError(path, "File not found.");
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    pushError(
      path,
      `Invalid JSON (${error instanceof Error ? error.message : "unknown error"}).`,
    );
    return null;
  }
}

function validateRegistry(registry) {
  if (!isObject(registry)) {
    pushError("registry", "Root value must be an object.");
    return;
  }

  if (
    typeof registry.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(registry.version)
  ) {
    pushError("version", "Must be a semantic version string like 1.0.0.");
  }

  if (
    typeof registry.updatedAt !== "string" ||
    Number.isNaN(Date.parse(registry.updatedAt))
  ) {
    pushError("updatedAt", "Must be a valid date string (YYYY-MM-DD).");
  }

  if (!Array.isArray(registry.families) || registry.families.length === 0) {
    pushError("families", "Must be a non-empty array.");
    return;
  }

  const familyIds = new Set();
  const componentIds = new Set();

  for (let i = 0; i < registry.families.length; i += 1) {
    const family = registry.families[i];
    const familyPath = `families[${i}]`;

    if (!isObject(family)) {
      pushError(familyPath, "Family must be an object.");
      continue;
    }

    if (typeof family.id !== "string" || family.id.length === 0) {
      pushError(`${familyPath}.id`, "Family id is required.");
    } else if (familyIds.has(family.id)) {
      pushError(`${familyPath}.id`, `Duplicate family id '${family.id}'.`);
    } else {
      familyIds.add(family.id);
    }

    if (!ALLOWED_STATUS.has(family.status)) {
      pushError(`${familyPath}.status`, "Invalid status value.");
    }

    if (!Array.isArray(family.components) || family.components.length === 0) {
      pushError(`${familyPath}.components`, "Must be a non-empty array.");
      continue;
    }

    for (let j = 0; j < family.components.length; j += 1) {
      const component = family.components[j];
      const componentPath = `${familyPath}.components[${j}]`;

      if (!isObject(component)) {
        pushError(componentPath, "Component must be an object.");
        continue;
      }

      if (typeof component.id !== "string" || component.id.length === 0) {
        pushError(`${componentPath}.id`, "Component id is required.");
      } else if (componentIds.has(component.id)) {
        pushError(
          `${componentPath}.id`,
          `Duplicate component id '${component.id}'.`,
        );
      } else {
        componentIds.add(component.id);
      }

      if (!ALLOWED_STATUS.has(component.status)) {
        pushError(`${componentPath}.status`, "Invalid status value.");
      }

      if (
        !isObject(component.variants) ||
        Object.keys(component.variants).length === 0
      ) {
        pushError(
          `${componentPath}.variants`,
          "Must be an object with at least one axis.",
        );
      } else {
        for (const [axis, values] of Object.entries(component.variants)) {
          if (!Array.isArray(values) || values.length === 0) {
            pushError(
              `${componentPath}.variants.${axis}`,
              "Axis values must be a non-empty array.",
            );
            continue;
          }
          for (const value of values) {
            if (typeof value !== "string" || value.length === 0) {
              pushError(
                `${componentPath}.variants.${axis}`,
                "Axis values must contain only non-empty strings.",
              );
            }
          }
        }
      }

      if (!Array.isArray(component.states) || component.states.length === 0) {
        pushError(`${componentPath}.states`, "Must be a non-empty array.");
      } else {
        for (const state of component.states) {
          if (!ALLOWED_STATES.has(state)) {
            pushError(`${componentPath}.states`, `Unknown state '${state}'.`);
          }
        }
      }

      if (
        !Array.isArray(component.responsiveBehavior) ||
        component.responsiveBehavior.length === 0
      ) {
        pushError(
          `${componentPath}.responsiveBehavior`,
          "Must be a non-empty array.",
        );
      } else {
        for (const value of component.responsiveBehavior) {
          if (!ALLOWED_RESPONSIVE.has(value)) {
            pushError(
              `${componentPath}.responsiveBehavior`,
              `Unknown value '${value}'.`,
            );
          }
        }
      }

      if (!isObject(component.a11y)) {
        pushError(`${componentPath}.a11y`, "Must be an object.");
      } else {
        if (typeof component.a11y.focusVisible !== "boolean") {
          pushError(`${componentPath}.a11y.focusVisible`, "Must be boolean.");
        }
        if (typeof component.a11y.keyboard !== "boolean") {
          pushError(`${componentPath}.a11y.keyboard`, "Must be boolean.");
        }
        if (
          typeof component.a11y.minTouchTargetDesktop !== "string" ||
          !/^\d+x\d+$/.test(component.a11y.minTouchTargetDesktop)
        ) {
          pushError(
            `${componentPath}.a11y.minTouchTargetDesktop`,
            "Must match format 44x44.",
          );
        }
        if (
          typeof component.a11y.minTouchTargetMobile !== "string" ||
          !/^\d+x\d+$/.test(component.a11y.minTouchTargetMobile)
        ) {
          pushError(
            `${componentPath}.a11y.minTouchTargetMobile`,
            "Must match format 48x48.",
          );
        }
      }

      if (!isObject(component.migration)) {
        pushError(`${componentPath}.migration`, "Must be an object.");
      } else {
        if (!ALLOWED_IMPACT.has(component.migration.impact)) {
          pushError(
            `${componentPath}.migration.impact`,
            "Invalid impact value.",
          );
        }
        if (
          typeof component.migration.targetWave !== "number" ||
          !Number.isInteger(component.migration.targetWave) ||
          component.migration.targetWave < 1
        ) {
          pushError(
            `${componentPath}.migration.targetWave`,
            "Must be an integer >= 1.",
          );
        }
      }
    }
  }
}

const schema = readJson(schemaPath);
const registry = readJson(registryPath);

if (schema && !isObject(schema)) {
  pushError("schema", "Schema root must be an object.");
}
if (schema && typeof schema.$id !== "string") {
  pushError("schema.$id", "Schema should define $id.");
}

if (registry) {
  validateRegistry(registry);
}

if (errors.length > 0) {
  console.error("Design system registry validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Design system registry is valid.");
