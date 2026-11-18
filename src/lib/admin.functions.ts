import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { embedTexts, isEmbeddingConfigured } from "@/lib/embeddings.server";
import { DEFAULT_MATCH_COUNT, DEFAULT_MATCH_THRESHOLD } from "@/lib/rag-tuning";

/** Creates a service-role Supabase client that bypasses RLS. Server-only. */
function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : "") || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const key = serviceKey || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY : "") || "";

  if (!serviceKey) {
    console.warn("[Admin] SUPABASE_SERVICE_ROLE_KEY not set — falling back to publishable key (RLS still enforced)");
  }

  // Custom fetch to handle new sb_secret_ / sb_publishable_ key format
  const customFetch: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    }
    const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
    if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient(url, key, {
    global: { fetch: customFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdminRole(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Access Denied: Only Platform Administrators can perform this action.");
  }
}

/**
 * Best-effort audit trail for privileged changes. Never throws: a failed audit
 * write must not roll back or mask the operation the administrator requested.
 */
async function recordAdminAudit(
  adminDb: any,
  entry: {
    actorId: string;
    action: "role_changed" | "instructor_verification_changed";
    targetUserId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    let actorEmail: string | null = null;
    try {
      const { data } = await adminDb.auth.admin.getUserById(entry.actorId);
      actorEmail = data?.user?.email ?? null;
    } catch {
      /* Email is informational only */
    }

    const { error } = await adminDb.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_email: actorEmail,
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      details: entry.details ?? {},
    });

    if (error) console.warn("[Admin] Failed to write audit log entry:", error.message);
  } catch (err) {
    console.warn("[Admin] Audit log error:", err instanceof Error ? err.message : err);
  }
}

export const getAdminTelemetry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    // Fetch profiles breakdown
    const { data: profiles } = await supabase.from("profiles").select("id, role, full_name, created_at");
    const totalUsers = profiles?.length ?? 1;

    const roleCounts = {
      student: profiles?.filter((p) => (p.role ?? "student") === "student").length ?? 0,
      instructor: profiles?.filter((p) => p.role === "instructor").length ?? 0,
      admin: profiles?.filter((p) => p.role === "admin").length ?? 0,
    };

    // Fetch course & enrollment counts
    const { count: totalCourses } = await supabase.from("courses").select("*", { count: "exact", head: true });
    const { count: totalEnrollments } = await supabase.from("course_enrollments").select("*", { count: "exact", head: true });
    const { count: totalVectorChunks } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true });
    // Chunks ingested before real embeddings existed have a NULL vector and are
    // invisible to retrieval until the backfill below runs.
    const { count: pendingVectorChunks } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .is("embedding", null);
    const { count: totalSessions } = await supabase.from("study_sessions").select("*", { count: "exact", head: true });

    // Fetch quiz attempts for student efficacy analytics
    const { data: quizAttempts, error: quizError } = await supabase
      .from("quiz_attempts")
      .select("score_percentage");
    if (quizError) {
      console.error("[Admin Telemetry] Failed to fetch quiz attempts:", quizError.message);
    }
    let avgQuizScore = 0;
    if (quizAttempts && quizAttempts.length > 0) {
      const totalScorePct = quizAttempts.reduce((acc, q) => acc + (q.score_percentage ?? 0), 0);
      avgQuizScore = Math.round(totalScorePct / quizAttempts.length);
    }

    // Fetch daily activity study minutes
    const { data: activity } = await supabase.from("daily_activity").select("minutes, topics_completed");
    const totalMinutes = activity?.reduce((acc, a) => acc + (a.minutes ?? 0), 0) ?? 0;
    const totalTopicsCompleted = activity?.reduce((acc, a) => acc + (a.topics_completed ?? 0), 0) ?? 0;

    return {
      totalUsers,
      totalCourses: totalCourses ?? 0,
      totalEnrollments: totalEnrollments ?? 0,
      totalVectorChunks: totalVectorChunks ?? 0,
      pendingVectorChunks: pendingVectorChunks ?? 0,
      totalSessions: totalSessions ?? 0,
      roleCounts,
      studentEfficacy: {
        avgQuizScore,
        totalMinutes,
        totalTopicsCompleted,
      },
    };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, onboarding_complete, is_verified_instructor, institution_name, academic_title, specialization, teaching_experience_years, bio, portfolio_url, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return users ?? [];
  });

export const getAdminCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title, degree_program, semester, category, status, created_at, instructor_id")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return courses ?? [];
  });

const updateUserRoleInput = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["student", "instructor", "admin"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateUserRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    // An administrator can never change their own role — that is the shortest
    // path to locking everyone out of the console.
    if (data.targetUserId === userId) {
      throw new Error("You cannot change your own role. Ask another administrator to do it.");
    }

    // Use service-role client to bypass RLS (admin verified above)
    const adminDb = getAdminSupabase();

    const { data: target, error: targetError } = await adminDb
      .from("profiles")
      .select("id, role")
      .eq("id", data.targetUserId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);
    if (!target) throw new Error("Target user not found.");

    const previousRole = target.role ?? "student";
    if (previousRole === data.role) {
      return { success: true, targetUserId: data.targetUserId, role: data.role, unchanged: true };
    }

    // Refuse to demote the final administrator.
    if (previousRole === "admin" && data.role !== "admin") {
      const { count, error: countError } = await adminDb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) throw new Error(countError.message);
      if ((count ?? 0) <= 1) {
        throw new Error("Cannot remove the last platform administrator.");
      }
    }

    const { error } = await adminDb
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.targetUserId);

    if (error) throw new Error(error.message);

    await recordAdminAudit(adminDb, {
      actorId: userId,
      action: "role_changed",
      targetUserId: data.targetUserId,
      details: { from: previousRole, to: data.role },
    });

    return { success: true, targetUserId: data.targetUserId, role: data.role };
  });

const verifyInstructorInput = z.object({
  targetUserId: z.string().uuid(),
  isVerified: z.boolean(),
});

export const verifyInstructor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => verifyInstructorInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const adminDb = getAdminSupabase();

    const { data: target } = await adminDb
      .from("profiles")
      .select("is_verified_instructor")
      .eq("id", data.targetUserId)
      .maybeSingle();

    const { error } = await adminDb
      .from("profiles")
      .update({ is_verified_instructor: data.isVerified })
      .eq("id", data.targetUserId);

    if (error) throw new Error(error.message);

    await recordAdminAudit(adminDb, {
      actorId: userId,
      action: "instructor_verification_changed",
      targetUserId: data.targetUserId,
      details: { from: target?.is_verified_instructor ?? false, to: data.isVerified },
    });

    // Broadcast automated notification to teacher
    try {
      await (adminDb.from as any)("notifications").insert({
        user_id: data.targetUserId,
        title: data.isVerified ? "Instructor Verification Approved 🎉" : "Instructor Verification Status Update",
        message: data.isVerified
          ? "Congratulations! Your educator credentials have been approved by platform administrators. You can now create and publish official courses."
          : "Your instructor account verification has been set to pending or rejected by administrators. Contact support if you have questions.",
        type: "system",
      });
    } catch {
      /* Silently ignore notification failure */
    }

    return { success: true, targetUserId: data.targetUserId, isVerified: data.isVerified };
  });

const toggleCourseStatusInput = z.object({
  courseId: z.string().uuid(),
  status: z.enum(["draft", "published", "archived"]),
});

export const toggleCourseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => toggleCourseStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const adminDb = getAdminSupabase();

    const { error } = await adminDb
      .from("courses")
      .update({ status: data.status })
      .eq("id", data.courseId);

    if (error) throw new Error(error.message);
    return { success: true, status: data.status };
  });

export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: settings } = await (supabase.from as any)("system_settings").select("key, value");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    return {
      aiModel: settingsMap["ai_model"] ?? "qwen-3.8-27b",
      matchThreshold: parseFloat(settingsMap["match_threshold"] ?? String(DEFAULT_MATCH_THRESHOLD)),
      matchCount: parseInt(settingsMap["match_count"] ?? String(DEFAULT_MATCH_COUNT), 10),
      maintenanceMode: settingsMap["maintenance_mode"] === "true",
      systemAnnouncement: settingsMap["system_announcement"] ?? "",
    };
  });

const updateSettingsInput = z.object({
  aiModel: z.string().optional(),
  matchThreshold: z.number().optional(),
  matchCount: z.number().optional(),
  maintenanceMode: z.boolean().optional(),
  systemAnnouncement: z.string().optional(),
});

export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateSettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const updates: Array<{ key: string; value: string }> = [];
    if (data.aiModel !== undefined) updates.push({ key: "ai_model", value: data.aiModel });
    if (data.matchThreshold !== undefined) updates.push({ key: "match_threshold", value: String(data.matchThreshold) });
    if (data.matchCount !== undefined) updates.push({ key: "match_count", value: String(data.matchCount) });
    if (data.maintenanceMode !== undefined) updates.push({ key: "maintenance_mode", value: String(data.maintenanceMode) });
    if (data.systemAnnouncement !== undefined) updates.push({ key: "system_announcement", value: data.systemAnnouncement });

    for (const update of updates) {
      await (supabase.from as any)("system_settings").upsert(update);
    }

    try {
      const { invalidateSystemSettingsCache } = await import("@/lib/settings.server");
      invalidateSystemSettingsCache();
    } catch {
      // Invalidation best-effort
    }

    return { success: true };
  });

export const purgeOrphanedVectorChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    const adminDb = getAdminSupabase();

    const { error, count } = await adminDb
      .from("document_chunks")
      .delete({ count: "exact" })
      .is("goal_id", null)
      .is("course_id", null);

    if (error) throw new Error(error.message);
    return { success: true, purgedCount: count ?? 0 };
  });

/** Rows embedded per invocation. Keeps one click inside the request timeout. */
const REEMBED_CHUNK_LIMIT = 500;

/**
 * Backfills real embeddings for chunks that have none.
 *
 * The old ingestion path stored character-histogram vectors; retyping the column
 * to `VECTOR(768)` nulled them. Those chunks keep their text but cannot be
 * retrieved until they are re-embedded, so this must run before grounded
 * citations are meaningful for existing uploads.
 *
 * Bounded per call: each click embeds up to {@link REEMBED_CHUNK_LIMIT} rows and
 * reports how many are left, so a large backlog repeats rather than timing out.
 */
export const reembedChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    if (!isEmbeddingConfigured()) {
      throw new Error(
        "Embeddings are not configured. Set GEMINI_API_KEY on the server before backfilling — no fake vectors will be written.",
      );
    }

    const adminDb = getAdminSupabase();
    const embeddedAt = new Date().toISOString();

    const { data: pending, error: selectError } = await adminDb
      .from("document_chunks")
      .select("id, content")
      .is("embedding", null)
      .order("created_at", { ascending: true })
      .limit(REEMBED_CHUNK_LIMIT);

    if (selectError) throw new Error(selectError.message);

    const rows = (pending ?? []) as Array<{ id: string; content: string }>;
    if (rows.length === 0) {
      return { reembedded: 0, remaining: 0, failed: 0 };
    }

    let reembedded = 0;
    let failed = 0;
    let embeddingModel: string | null = null;

    try {
      const { vectors, model } = await embedTexts(
        rows.map((row) => row.content),
        "RETRIEVAL_DOCUMENT",
      );
      embeddingModel = model;

      // One update per row: PostgREST has no bulk update by id list, and these
      // rows are independent, so run them concurrently.
      const results = await Promise.all(
        rows.map((row, index) =>
          adminDb
            .from("document_chunks")
            .update({
              embedding: JSON.stringify(vectors[index]),
              embedding_model: model,
              embedded_at: embeddedAt,
            })
            .eq("id", row.id),
        ),
      );

      results.forEach((result) => {
        if (result.error) failed += 1;
        else reembedded += 1;
      });
    } catch (error) {
      // The provider failed for the whole batch; nothing was written.
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding backfill failed: ${message}`);
    }

    const { count: remaining } = await adminDb
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .is("embedding", null);

    if (failed > 0) {
      console.error(
        `[Admin] Re-embed backfill: ${failed} of ${rows.length} chunks failed with model ${embeddingModel}.`,
      );
    }

    return { reembedded, remaining: remaining ?? 0, failed };
  });

export const getAdminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdminRole(supabase, userId);

    // Read through the caller's client so the admin-only SELECT policy applies.
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, actor_id, actor_email, action, target_user_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return data ?? [];
  });
