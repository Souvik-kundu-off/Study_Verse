#!/usr/bin/env node
/**
 * Regenerates src/integrations/supabase/types.ts from the live database.
 *
 * The project is not linked to the Supabase CLI and has no access token, so
 * `supabase gen types` is unavailable. This script reaches the same schema
 * through PostgREST's OpenAPI reflection, which exposes every table, column,
 * nullability, default, and foreign key in the exposed schema.
 *
 * Usage: npm run types
 *
 * What it derives:
 *   - Tables   -> Row / Insert / Update / Relationships
 *   - Functions-> Args (from the RPC request schema) and Returns
 *   - nullability from the OpenAPI "required" list (NOT NULL columns)
 *   - Insert optionality from NOT NULL + has-default
 *
 * What it cannot derive, and therefore keeps as a declared map below:
 *   - the return type of an RPC (PostgREST does not reflect it)
 *   - enum-like unions for plain text columns that the app narrows by hand
 *
 * Anything new that shows up in the database and is not covered by one of
 * those maps is reported on stderr rather than silently mistyped.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES_PATH = resolve(ROOT, "src/integrations/supabase/types.ts");
const ENV_PATH = resolve(ROOT, ".env");

/* ------------------------------------------------------------------ */
/* env                                                                 */
/* ------------------------------------------------------------------ */

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(ENV_PATH, "utf8");
  } catch {
    raw = "";
  }
  const env = { ...process.env };
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) env[key] = value;
  }
  return env;
}

/* ------------------------------------------------------------------ */
/* knowledge PostgREST does not expose                                 */
/* ------------------------------------------------------------------ */

/**
 * RPC return types. PostgREST's OpenAPI describes RPC arguments but not
 * results, so these mirror the RETURNS clause in supabase/migrations.
 */
const RPC_RETURNS = {
  is_platform_admin: "boolean",
  platform_admin_count: "number",
  is_verified_instructor: "boolean",
  owns_course: "boolean",
  teaches_student: "boolean",
  match_document_chunks: [
    "{",
    "  id: string",
    "  document_name: string",
    "  page_number: number",
    "  content: string",
    "  similarity: number",
    "}[]",
  ].join("\n          "),
};

/**
 * Plain text columns the application treats as a closed union. PostgREST
 * reports these as `text`, so the narrower type is applied here.
 */
const ENUM_OVERRIDES = {
  "profiles.role": '"student" | "instructor" | "admin"',
};

/* ------------------------------------------------------------------ */
/* type mapping                                                        */
/* ------------------------------------------------------------------ */

const SCALARS = {
  string: "string",
  text: "string",
  uuid: "string",
  varchar: "string",
  bpchar: "string",
  char: "string",
  citext: "string",
  bytea: "string",
  date: "string",
  timestamp: "string",
  "timestamp with time zone": "string",
  "timestamp without time zone": "string",
  time: "string",
  "time with time zone": "string",
  "time without time zone": "string",
  integer: "number",
  int: "number",
  int2: "number",
  int4: "number",
  int8: "number",
  smallint: "number",
  bigint: "number",
  numeric: "number",
  decimal: "number",
  real: "number",
  float: "number",
  float4: "number",
  float8: "number",
  "double precision": "number",
  boolean: "boolean",
  bool: "boolean",
  json: "Json",
  jsonb: "Json",
};

function scalarType(name, format) {
  const fmt = (format ?? "").replace(/^public\./, "");
  if (fmt.startsWith("vector")) return "string";
  if (SCALARS[name]) return SCALARS[name];
  if (SCALARS[fmt]) return SCALARS[fmt];
  // Numeric precision variants, e.g. "numeric(10,2)"
  if (/^(numeric|decimal)\(/.test(fmt)) return "number";
  if (/^(varchar|char|bit|varbit)\(/.test(fmt)) return "string";
  return null;
}

function columnType(table, column, prop) {
  const override = ENUM_OVERRIDES[`${table}.${column}`];
  if (override) return override;

  if (prop.type === "array") {
    const inner = prop.items ?? {};
    const base = scalarType(inner.type, inner.format) ?? "Json";
    return base === "Json" ? "Json[]" : `${base}[]`;
  }
  const mapped = scalarType(prop.type, prop.format);
  if (!mapped) {
    throw new Error(
      `Unmapped column type in ${table}.${column}: type=${prop.type} format=${prop.format}`,
    );
  }
  return mapped;
}

/* ------------------------------------------------------------------ */
/* introspection                                                       */
/* ------------------------------------------------------------------ */

const FK_PATTERN = /This is a Foreign Key to `([a-z_]+)\.([a-z_]+)`/;

function readTable(name, definition) {
  const required = new Set(definition.required ?? []);
  const props = definition.properties ?? {};

  const columns = Object.entries(props)
    .map(([column, prop]) => {
      const notNull = required.has(column);
      const hasDefault = "default" in prop;
      return {
        column,
        type: columnType(name, column, prop),
        notNull,
        hasDefault,
        optional: !notNull || hasDefault,
      };
    })
    .sort((a, b) => a.column.localeCompare(b.column));

  const relationships = [];
  for (const [column, prop] of Object.entries(props)) {
    const match = FK_PATTERN.exec(prop.description ?? "");
    if (!match) continue;
    relationships.push({
      foreignKeyName: `${name}_${column}_fkey`,
      column,
      referencedRelation: match[1],
      referencedColumns: [match[2]],
    });
  }
  relationships.sort((a, b) => a.foreignKeyName.localeCompare(b.foreignKeyName));

  return { columns, relationships };
}

function renderInterface(kind, columns) {
  const lines = columns.map((c) => {
    // Updates are partial by definition, so every column is optional there.
    // Inserts are optional only where the database would accept a missing
    // value: nullable, or NOT NULL with a default.
    const optional = kind === "Update" || (kind === "Insert" && c.optional) ? "?" : "";
    const nullable = c.notNull ? "" : " | null";
    return `          ${c.column}${optional}: ${c.type}${nullable}`;
  });
  return lines.join("\n");
}

function renderRelationships(relationships) {
  if (relationships.length === 0) return "        Relationships: []";
  const blocks = relationships.map((r) =>
    [
      "          {",
      `            foreignKeyName: "${r.foreignKeyName}"`,
      `            columns: ["${r.column}"]`,
      "            isOneToOne: false",
      `            referencedRelation: "${r.referencedRelation}"`,
      `            referencedColumns: [${r.referencedColumns.map((c) => `"${c}"`).join(", ")}]`,
      "          },",
    ].join("\n"),
  );
  return `        Relationships: [\n${blocks.join("\n")}\n        ]`;
}

function renderFunctions(paths) {
  const names = Object.keys(paths)
    .filter((p) => p.startsWith("/rpc/"))
    .map((p) => p.slice("/rpc/".length))
    .sort();

  if (names.length === 0) return "      [_ in never]: never";

  const missing = [];
  const blocks = names.map((name) => {
    const post = paths[`/rpc/${name}`].post;
    const schema = post?.parameters?.find((p) => p.in === "body")?.schema ?? {};
    const required = new Set(schema.required ?? []);
    const args = Object.entries(schema.properties ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([arg, prop]) => {
        const base = scalarType(prop.type, prop.format) ?? "unknown";
        const optional = required.has(arg) ? "" : "?";
        return `        ${arg}${optional}: ${base}`;
      });

    const returns = RPC_RETURNS[name];
    if (returns === undefined) missing.push(name);

    const argsBlock = args.length
      ? `      Args: {\n${args.join("\n")}\n      }`
      : "      Args: Record<PropertyKey, never>";
    return `      ${name}: {\n${argsBlock}\n      Returns: ${returns ?? "unknown"}\n      }`;
  });

  if (missing.length > 0) {
    process.stderr.write(
      `warning: no return type declared for RPC(s): ${missing.join(", ")}\n` +
        `         add them to RPC_RETURNS in scripts/generate-db-types.mjs\n`,
    );
  }

  return blocks.join("\n");
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("VITE_SUPABASE_URL and a Supabase key are required in .env");
}

const response = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/openapi+json",
  },
});
if (!response.ok) {
  throw new Error(`OpenAPI request failed: ${response.status} ${response.statusText}`);
}
const spec = await response.json();

const definitions = spec.definitions ?? {};
const tableNames = Object.keys(definitions).sort();

const tables = tableNames.map((name) => {
  const { columns, relationships } = readTable(name, definitions[name]);
  return [
    `      ${name}: {`,
    `        Row: {\n${renderInterface("Row", columns)}\n        }`,
    `        Insert: {\n${renderInterface("Insert", columns)}\n        }`,
    `        Update: {\n${renderInterface("Update", columns)}\n        }`,
    renderRelationships(relationships),
    "      }",
  ].join("\n");
});

const existing = readFileSync(TYPES_PATH, "utf8");
const boilerplateMarker = "type DatabaseWithoutInternals";
const markerIndex = existing.indexOf(boilerplateMarker);
if (markerIndex === -1) {
  throw new Error(`Could not find "${boilerplateMarker}" in ${TYPES_PATH}; refusing to overwrite`);
}
const boilerplate = existing.slice(markerIndex).replace(/^\n+/, "");

const postgrestVersion = spec.info?.version ?? "14.5";

const output = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "${postgrestVersion}"
  }
  public: {
    Tables: {
${tables.join("\n")}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${renderFunctions(spec.paths ?? {})}
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

${boilerplate}`;

writeFileSync(TYPES_PATH, output);
process.stdout.write(
  `wrote ${TYPES_PATH}\n  ${tableNames.length} tables, ` +
    `${Object.keys(spec.paths ?? {}).filter((p) => p.startsWith("/rpc/")).length} functions\n`,
);
