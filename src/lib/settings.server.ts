import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_MATCH_COUNT, DEFAULT_MATCH_THRESHOLD } from "@/lib/rag-tuning";

export interface SystemSettingsConfig {
  aiModel: string;
  matchThreshold: number;
  matchCount: number;
  maintenanceMode: boolean;
  systemAnnouncement: string;
  timestamp: number;
}

let cachedSettings: SystemSettingsConfig | null = null;
const CACHE_TTL_MS = 10000; // 10 seconds

/**
 * Server-side reader for system_settings.
 * Cached in-memory with a short TTL for high performance while staying responsive to admin updates.
 */
export async function getSystemSettingsServer(forceRefresh = false): Promise<SystemSettingsConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now - cachedSettings.timestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const { data: settings, error } = await (supabaseAdmin.from as any)("system_settings").select("key, value");

    if (error) {
      console.warn("[SystemSettings] Failed to fetch settings from Supabase, falling back to defaults:", error.message);
    }

    const map: Record<string, string> = {};
    settings?.forEach((s: any) => {
      map[s.key] = s.value;
    });

    cachedSettings = {
      aiModel: map["ai_model"] ?? "openai/gpt-oss-120b",
      matchThreshold: parseFloat(map["match_threshold"] ?? String(DEFAULT_MATCH_THRESHOLD)),
      matchCount: parseInt(map["match_count"] ?? String(DEFAULT_MATCH_COUNT), 10),
      maintenanceMode: map["maintenance_mode"] === "true",
      systemAnnouncement: map["system_announcement"] ?? "",
      timestamp: now,
    };
    return cachedSettings;
  } catch (err) {
    console.warn("[SystemSettings] Unexpected error reading settings, using fallbacks:", err);
    return (
      cachedSettings ?? {
        aiModel: "openai/gpt-oss-120b",
        matchThreshold: DEFAULT_MATCH_THRESHOLD,
        matchCount: DEFAULT_MATCH_COUNT,
        maintenanceMode: false,
        systemAnnouncement: "",
        timestamp: now,
      }
    );
  }
}

/**
 * Invalidate the settings cache immediately after an admin update.
 */
export function invalidateSystemSettingsCache(): void {
  cachedSettings = null;
}
