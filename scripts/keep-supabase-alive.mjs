#!/usr/bin/env node

/**
 * Keep Supabase Alive Script
 * Sends lightweight queries to the Supabase database & auth endpoints
 * to prevent the project from pausing after 7 days of inactivity.
 */

import fs from "node:fs";
import path from "node:path";

// Load .env locally if env variables are not already present
function loadEnvFallback() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFallback();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Supabase URL or Key is missing.");
  console.error(
    "Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) are configured.",
  );
  process.exit(1);
}

const cleanUrl = supabaseUrl.replace(/\/$/, "");

async function pingEndpoint(name, url, headers) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        ...headers,
      },
    });
    const duration = Date.now() - start;
    const ok = res.status >= 200 && res.status < 400;
    const symbol = ok ? "✅" : "⚠️";
    console.log(`${symbol} [${name}] HTTP ${res.status} (${duration}ms) -> ${url}`);
    return ok;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ [${name}] Failed after ${duration}ms:`, err.message);
    return false;
  }
}

async function main() {
  const timestamp = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`🚀 Supabase Keep-Alive Ping - ${timestamp}`);
  console.log(`Target: ${cleanUrl}`);
  console.log(`======================================================`);

  const results = [];

  // 1. PostgREST database query (executes real query against Postgres database)
  results.push(
    await pingEndpoint("Database (PostgREST)", `${cleanUrl}/rest/v1/goals?select=id&limit=1`, {
      "Range-Unit": "items",
    }),
  );

  // 2. Auth service health check
  results.push(await pingEndpoint("Auth Service", `${cleanUrl}/auth/v1/health`, {}));

  const anySuccess = results.some(Boolean);

  console.log(`======================================================`);
  if (anySuccess) {
    console.log("🎉 Successfully pinged Supabase! Inactivity timer has been refreshed.\n");
    process.exit(0);
  } else {
    console.error("❌ All ping attempts failed. Please verify credentials.\n");
    process.exit(1);
  }
}

main();
