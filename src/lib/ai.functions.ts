import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const roadmapInput = z.object({
  goalTitle: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  minutesPerDay: z.number().int().min(15).max(480),
  deadline: z.string().nullable().optional(),
  learningStyle: z.string().max(80).optional(),
  syllabusText: z.string().max(10000).optional(),
  timeSlotPreference: z.enum(["morning", "afternoon", "evening", "night", "flexible"]).optional(),
  depth: z.enum(["auto", "sprint", "standard", "comprehensive"]).optional().default("auto"),
});

const RoadmapSchema = {
  type: "object",
  additionalProperties: false,
  required: ["overview", "modules"],
  properties: {
    overview: { type: "string" },
    modules: {
      type: "array",
      minItems: 3,
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "estimated_minutes", "topics"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          estimated_minutes: { type: "integer" },
          topics: {
            type: "array",
            minItems: 2,
            maxItems: 14,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "description", "estimated_minutes", "key_concepts", "resources"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                estimated_minutes: { type: "integer" },
                key_concepts: { type: "array", items: { type: "string" } },
                resources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["kind", "title"],
                    properties: {
                      kind: { type: "string", enum: ["video", "article", "docs", "practice"] },
                      title: { type: "string" },
                      note: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

type RoadmapAI = {
  overview: string;
  modules: Array<{
    title: string;
    description: string;
    estimated_minutes: number;
    topics: Array<{
      title: string;
      description: string;
      estimated_minutes: number;
      key_concepts: string[];
      resources: Array<{ kind: string; title: string; note?: string }>;
    }>;
  }>;
};

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options?: { maxTokens?: number; jsonMode?: boolean; preferredModel?: string }
): Promise<string> {
  const baseCandidates = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
  ];

  let candidates = [...baseCandidates];
  if (options?.preferredModel) {
    const pref = options.preferredModel.toLowerCase();
    if (pref.includes("qwen")) {
      candidates = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];
    } else if (pref.includes("120b")) {
      candidates = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];
    } else if (pref.includes("20b")) {
      candidates = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];
    }
  }

  let lastErr = "";
  for (const model of candidates) {
    try {
      const isQwen = model.startsWith("qwen/");
      const maxTokens = isQwen ? Math.min(options?.maxTokens ?? 2048, 2048) : (options?.maxTokens ?? 6144);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: maxTokens,
          ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        return payload.choices?.[0]?.message?.content ?? "";
      }

      const body = await res.text();
      lastErr = `[${model}] ${res.status}: ${body.slice(0, 150)}`;
      console.warn(`Groq model ${model} returned ${res.status}, checking next candidate...`);
      // If 429 (OTPM rate limit) or 503 or 404, try next Groq candidate model
      if (res.status === 429 || res.status === 503 || res.status === 404) {
        continue;
      }
    } catch (e) {
      lastErr = `[${model}] ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
  }

  throw new Error(`Groq failed on all models: ${lastErr}`);
}

async function callGemini(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system")?.content;
  const userMsgs = messages.filter((m) => m.role !== "system");

  const contents = userMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const reqBody: Record<string, unknown> = { contents };
  if (systemMsg) {
    reqBody.systemInstruction = { parts: [{ text: systemMsg }] };
  }

  const candidates = [
    "v1beta/models/gemini-flash-lite-latest:generateContent",
    "v1beta/models/gemini-3.1-flash-lite:generateContent",
    "v1beta/models/gemini-flash-latest:generateContent",
    "v1beta/models/gemini-3.8-flash:generateContent",
    "v1beta/models/gemini-3.5-flash:generateContent",
  ];

  let lastErr = "";
  for (const path of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${path}?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        }
      );

      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      const errText = await res.text();
      lastErr = `[${path}] ${res.status}: ${errText.slice(0, 150)}`;
      console.warn(`Gemini model ${path} returned ${res.status}, checking next candidate...`);

      // If 503 (demand spike), 429, or 404, try next candidate
      if (res.status === 503 || res.status === 429 || res.status === 404) {
        continue;
      }
    } catch (e) {
      lastErr = `[${path}] ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
  }

  throw new Error(`Gemini: all model candidates failed. ${lastErr}`);
}

/**
 * Robust JSON parser that extracts JSON blocks, handles markdown formatting,
 * and automatically repairs truncated strings, arrays, and objects.
 */
function safeJsonParse<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== "string") return {} as T;

  let text = raw.trim();

  // Strip markdown codeblock if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    text = match[1].trim();
  }

  // Find opening bracket
  const jsonStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  let startIdx = 0;
  if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
    startIdx = jsonStart;
  } else if (arrayStart !== -1) {
    startIdx = arrayStart;
  }
  text = text.slice(startIdx);

  // Attempt direct JSON.parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // If there is trailing text after valid JSON, find the outermost matching brace
    try {
      const isObject = text.startsWith("{");
      const openChar = isObject ? "{" : "[";
      const closeChar = isObject ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIdx = -1;

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === "\\" && inString) {
          escaped = !escaped;
          continue;
        }
        if (c === '"' && !escaped) {
          inString = !inString;
        } else if (!inString) {
          if (c === openChar) depth++;
          else if (c === closeChar) {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
        escaped = false;
      }

      if (endIdx !== -1) {
        return JSON.parse(text.slice(0, endIdx + 1)) as T;
      }
    } catch {
      // Continue to automated structural repair
    }

    // Automated structural closure of truncated JSON
    try {
      let inString = false;
      let escaped = false;
      const stack: string[] = [];
      let buffer = text.trim();

      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c === "\\" && inString) {
          escaped = !escaped;
          continue;
        }
        if (c === '"' && !escaped) {
          inString = !inString;
        } else if (!inString) {
          if (c === "{" || c === "[") stack.push(c);
          else if (c === "}" && stack[stack.length - 1] === "{") stack.pop();
          else if (c === "]" && stack[stack.length - 1] === "[") stack.pop();
        }
        escaped = false;
      }

      if (inString) buffer += '"';
      buffer = buffer.replace(/,\s*$/, "");
      buffer = buffer.replace(/:\s*$/, ': ""');

      while (stack.length > 0) {
        const open = stack.pop();
        buffer += open === "{" ? "}" : "]";
      }

      return JSON.parse(buffer) as T;
    } catch {
      console.warn("safeJsonParse failed to parse JSON entirely, returning empty object");
      return {} as T;
    }
  }
}

/**
 * Normalizes any LLM-returned roadmap shape into a guaranteed structure with arrays.
 */
function extractRoadmapData(parsed: any): {
  overview: string;
  modules: Array<{
    title: string;
    description: string;
    estimated_minutes: number;
    topics: Array<{
      title: string;
      description: string;
      estimated_minutes: number;
      key_concepts: string[];
      resources: Array<{ kind: "video" | "article" | "docs" | "practice"; title: string; note?: string }>;
    }>;
  }>;
} {
  let overview = typeof parsed?.overview === "string" ? parsed.overview : "Custom Learning Roadmap";
  let rawModules: any[] = [];

  if (Array.isArray(parsed)) {
    rawModules = parsed;
  } else if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.modules)) {
      rawModules = parsed.modules;
    } else if (Array.isArray(parsed.chapters)) {
      rawModules = parsed.chapters;
    } else if (Array.isArray(parsed.curriculum)) {
      rawModules = parsed.curriculum;
    } else if (Array.isArray(parsed.roadmap)) {
      rawModules = parsed.roadmap;
    } else if (Array.isArray(parsed.units)) {
      rawModules = parsed.units;
    } else if (Array.isArray(parsed.sections)) {
      rawModules = parsed.sections;
    } else if (Array.isArray(parsed.roadmap?.modules)) {
      rawModules = parsed.roadmap.modules;
    } else if (Array.isArray(parsed.curriculum?.modules)) {
      rawModules = parsed.curriculum.modules;
    } else if (Array.isArray(parsed.data?.modules)) {
      rawModules = parsed.data.modules;
    } else if (Array.isArray(parsed.data)) {
      rawModules = parsed.data;
    }
  }

  // Normalize each module and its topics
  const normalizedModules = rawModules.map((m: any, mi: number) => {
    const title = typeof m === "string" ? m : (m?.title ?? m?.name ?? `Module ${mi + 1}`);
    const description = typeof m === "object" ? (m?.description ?? m?.desc ?? "") : "";
    const estimated_minutes = typeof m === "object" && typeof m?.estimated_minutes === "number" ? m.estimated_minutes : 60;

    const rawTopics: any[] =
      Array.isArray(m?.topics)
        ? m.topics
        : Array.isArray(m?.lessons)
        ? m.lessons
        : Array.isArray(m?.chapters)
        ? m.chapters
        : Array.isArray(m?.subtopics)
        ? m.subtopics
        : [];

    const topics = (rawTopics.length > 0 ? rawTopics : [{ title, description, estimated_minutes: 30 }]).map((t: any, ti: number) => ({
      title: typeof t === "string" ? t : (t?.title ?? t?.name ?? `Topic ${ti + 1}`),
      description: typeof t === "string" ? "" : (t?.description ?? t?.desc ?? ""),
      estimated_minutes: typeof t === "object" && typeof t?.estimated_minutes === "number" ? t.estimated_minutes : 30,
      key_concepts: Array.isArray(t?.key_concepts) ? t.key_concepts : [typeof t === "string" ? t : (t?.title ?? "Core concept")],
      resources: Array.isArray(t?.resources) ? t.resources : [{ kind: "article" as const, title: `${typeof t === "string" ? t : (t?.title ?? "Topic")} Guide` }],
    }));

    return {
      title,
      description,
      estimated_minutes,
      topics,
    };
  });

  return {
    overview,
    modules: normalizedModules,
  };
}

/**
 * Universal AI Caller for roadmaps, quizzes, flashcards, notes, etc.
 * Dynamically respects system_settings (ai_model and maintenance_mode).
 */
async function callAI(
  messages: Array<{ role: string; content: string }>,
  options?: { maxTokens?: number; jsonMode?: boolean; isAdmin?: boolean }
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  let preferredModel = "openai/gpt-oss-120b";
  try {
    const { getSystemSettingsServer } = await import("@/lib/settings.server");
    const settings = await getSystemSettingsServer();
    if (settings.maintenanceMode && !options?.isAdmin) {
      throw new Error("StudyVerse is currently under maintenance. AI generation is temporarily paused.");
    }
    if (settings.aiModel) {
      preferredModel = settings.aiModel;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("maintenance")) {
      throw err;
    }
  }

  const errors: string[] = [];
  const preferGemini = preferredModel.toLowerCase().includes("gemini");

  // If Admin prefers Gemini as master model, route to Gemini first
  if (preferGemini && geminiKey) {
    try {
      return await callGemini(messages, geminiKey);
    } catch (err) {
      console.warn("Preferred Gemini failed in callAI, trying Groq fallback:", err);
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 1. Primary or Fallback: Groq (with preferred model candidate)
  if (groqKey) {
    try {
      return await callGroq(messages, groqKey, { ...options, preferredModel });
    } catch (err) {
      console.warn("Groq failed in callAI, falling back to Gemini:", err);
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Secondary Fallback: Google Gemini (if not already attempted)
  if (!preferGemini && geminiKey) {
    try {
      return await callGemini(messages, geminiKey);
    } catch (err) {
      console.warn("Gemini failed in callAI fallback:", err);
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`AI generation failed: ${errors.join(" | ")}`);
  }

  throw new Error("No AI key configured. Add GROQ_API_KEY or GEMINI_API_KEY to your .env file.");
}

/**
 * Dedicated Tutor Caller.
 * Primary: Google Gemini
 * Fallback: Groq
 */
async function callTutor(
  messages: Array<{ role: string; content: string }>,
  options?: { isAdmin?: boolean }
): Promise<string> {
  try {
    const { getSystemSettingsServer } = await import("@/lib/settings.server");
    const settings = await getSystemSettingsServer();
    if (settings.maintenanceMode && !options?.isAdmin) {
      throw new Error("StudyVerse is currently under maintenance. AI Tutor is temporarily paused.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("maintenance")) {
      throw err;
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const errors: string[] = [];

  // 1. Primary for Tutor: Google Gemini
  if (geminiKey) {
    try {
      return await callGemini(messages, geminiKey);
    } catch (err) {
      console.warn("Gemini tutor call failed, falling back to Groq:", err);
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Fallback for Tutor: Groq
  if (groqKey) {
    try {
      return await callGroq(messages, groqKey);
    } catch (err) {
      console.warn("Groq tutor fallback failed:", err);
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`AI Tutor unavailable: ${errors.join(" | ")}`);
  }

  throw new Error("No AI key configured for tutor. Add GEMINI_API_KEY or GROQ_API_KEY to your .env file.");
}


export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => roadmapInput.parse(input))
  .handler(async ({ data, context }) => {
    // Depth-aware module/topic ranges with autonomous AI scaling
    const depth = data.depth ?? "auto";

    let depthGuidance = "";
    if (depth === "sprint") {
      depthGuidance = `MODE: Fast-Track Crash Course.
- Allocate 4 to 6 focused modules.
- Each module must contain 3 to 5 high-yield essential chapters/topics.`;
    } else if (depth === "standard") {
      depthGuidance = `MODE: Standard University Semester Course.
- Allocate 7 to 10 progressive modules.
- Each module must contain 4 to 6 detailed chapters/topics.`;
    } else if (depth === "comprehensive") {
      depthGuidance = `MODE: Exhaustive Deep-Dive Mastery Track.
- Allocate 11 to 16+ comprehensive modules.
- Each module must contain 5 to 8 rigorous, granular chapters/topics covering fundamentals, edge-cases, algorithms/derivations, and classic problem patterns.`;
    } else {
      // "auto": AI decides autonomously based on subject breadth
      depthGuidance = `MODE: Autonomous Subject-Scale Curriculum Design (Recommended).
As an elite academic curriculum architect, evaluate the true pedagogical breadth of "${data.goalTitle}":
- If the subject is a large, foundational engineering or scientific field (e.g., Data Structures & Algorithms, Operating Systems, Machine Learning, Computer Networks, System Design, GATE CSE, Calculus, Organic Chemistry):
  DO NOT COMPRESS OR SKIP DOMAINS. Allocate as many distinct modules as standard university / industry curricula require (typically 10 to 16+ comprehensive modules).
  Each module MUST contain 5 to 8 granular chapters/topics covering foundational mechanics, variants, trade-offs, and classic problem patterns.
- If the subject is a compact, focused tool or library (e.g., "Git", "Tailwind CSS", "Zustand"), allocate 4 to 7 focused modules with 3 to 5 chapters each.
You have FULL PEDAGOGICAL AUTHORITY to scale the module and chapter count to match what genuine mastery demands.`;
    }

    const prompt = `You are a university curriculum chair designing a world-class study syllabus for a ${data.level} learner.

Goal: ${data.goalTitle}
${data.description ? `Context: ${data.description}` : ""}
${data.category ? `Category: ${data.category}` : ""}
${data.deadline ? `Deadline: ${data.deadline}` : "Self-paced / No hard deadline"}
Available study time: ${data.minutesPerDay} minutes/day
Preferred learning style: ${data.learningStyle ?? "mixed"}
${data.timeSlotPreference ? `Target Schedule Slot: ${data.timeSlotPreference}` : ""}
${data.syllabusText ? `CUSTOM SYLLABUS / COURSE OUTLINE PROVIDED BY USER:\n"""\n${data.syllabusText}\n"""\nCRITICAL INSTRUCTION: Strictly reflect all chapters and topics in the user-provided syllabus above. Never truncate or bundle multiple chapters into one.` : ""}

${depthGuidance}

CRITICAL RULES FOR HIGH-DETAIL CHAPTERS / TOPICS:
1. Do NOT write lazy 1-sentence descriptions. For each topic, write a thorough 2-3 sentence technical overview explaining:
   - What the core concept or mechanism is.
   - How it works under the hood (e.g. pointer manipulation, state transitions, time/space complexity).
   - Classic practical pattern or real-world application (e.g. "LeetCode pattern: Fast & Slow Pointers (Floyd's Cycle Finding)", "Cache invalidation in distributed systems").
2. For "key_concepts": Provide 5 to 8 specific sub-concepts, formulas, or algorithmic patterns per topic (e.g. ["Two Pointers", "Sliding Window", "At Most K Distinct", "Prefix Sum Arrays", "Edge Case: Empty Array"]).
3. Set realistic "estimated_minutes" reflecting genuine study time (typically 30–90 min).
4. Provide 2-3 high-quality recommended resource types with descriptive titles (practice problem, official docs, interactive visualization, video breakdown).

Return ONLY valid JSON matching this TypeScript shape (no markdown around it, no commentary):
{
  "overview": string,
  "modules": Array<{
    "title": string,
    "description": string,
    "estimated_minutes": number,
    "topics": Array<{
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "key_concepts": string[],
      "resources": Array<{ "kind": "video"|"article"|"docs"|"practice", "title": string, "note"?: string }>
    }>
  }>
}`;

    // Scale maxTokens based on depth to avoid truncation
    const maxTokens = depth === "sprint" ? 8192 : 16384;

    const raw = await callAI(
      [
        { role: "system", content: "You are a world-class learning designer. You produce comprehensive, well-structured study roadmaps as strict json. Never omit important sub-topics to save space." },
        { role: "user", content: prompt },
      ],
      { maxTokens, jsonMode: true }
    );

    const parsed = safeJsonParse(raw);
    const roadmapData = extractRoadmapData(parsed);

    if (!roadmapData.modules || roadmapData.modules.length === 0) {
      console.error("AI returned unparsable roadmap response:", raw);
      throw new Error("The AI generated a roadmap in an unrecognized format. Please try generating again.");
    }

    // Persist to DB as this user
    const { supabase, userId } = context;

    // Set other goals to non-active so this newly created goal is primary, but preserve them in DB for multi-track switching
    await supabase.from("goals").update({ is_active: false }).eq("user_id", userId);

    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: data.goalTitle,
        description: data.description ?? roadmapData.overview,
        category: data.category,
        level: data.level,
        minutes_per_day: data.minutesPerDay,
        deadline: data.deadline ?? null,
        learning_style: data.learningStyle,
        time_slot_preference: data.timeSlotPreference ?? "flexible",
        syllabus_text: data.syllabusText ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    if (goalErr || !goal) throw new Error(goalErr?.message ?? "Failed to save goal");

    for (const [mi, mod] of roadmapData.modules.entries()) {
      const { data: modRow, error: modErr } = await supabase
        .from("roadmap_modules")
        .insert({
          user_id: userId,
          goal_id: goal.id,
          ordinal: mi,
          title: mod.title,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
        })
        .select("id")
        .single();
      if (modErr || !modRow) throw new Error(modErr?.message ?? "Failed to save module");

      const topicsRows = mod.topics.map((t, ti) => ({
        user_id: userId,
        goal_id: goal.id,
        module_id: modRow.id,
        ordinal: ti,
        title: t.title,
        description: t.description,
        estimated_minutes: t.estimated_minutes,
        key_concepts: t.key_concepts,
        resources: t.resources,
      }));
      const { error: tErr } = await supabase.from("roadmap_topics").insert(topicsRows);
      if (tErr) throw new Error(tErr.message);
    }

    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", userId);

    return { goalId: goal.id, overview: roadmapData.overview };
  });

const expandRoadmapInput = z.object({
  goalId: z.string().uuid(),
  promptHint: z.string().max(500).optional(),
});

export const expandRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => expandRoadmapInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch goal details
    const { data: goal, error: gErr } = await supabase
      .from("goals")
      .select("id, title, description, category, level, minutes_per_day, learning_style")
      .eq("id", data.goalId)
      .eq("user_id", userId)
      .single();

    if (gErr || !goal) throw new Error("Goal not found");

    // 2. Fetch existing modules & topics
    const { data: existingModules } = await supabase
      .from("roadmap_modules")
      .select("id, title, ordinal")
      .eq("goal_id", goal.id)
      .order("ordinal", { ascending: true });

    const existingTitles = (existingModules ?? []).map((m) => m.title).join(", ");
    const nextOrdinal = (existingModules ?? []).length;

    const prompt = `You are expanding an existing learning roadmap for a ${goal.level} learner.

Goal: ${goal.title}
Category: ${goal.category ?? "General"}
Existing Modules Already Covered in this roadmap:
${existingTitles || "None"}

${data.promptHint ? `User Request for New Modules: ${data.promptHint}` : "Identify the next 2-4 critical progressive or advanced modules that are MISSING from the existing modules list above to provide complete, rigorous mastery of this subject (e.g. for DSA, ensure missing areas like Trees, Graphs, Dynamic Programming, Heaps, Backtracking, or System Design are added)."}

Design 2-4 new progressive modules, each with 4-7 detailed topics.
For each topic:
1. Provide a detailed 2-3 sentence technical overview of the mechanics, trade-offs, and practical relevance.
2. Provide 5-8 granular sub-concepts, algorithms, or problem patterns in "key_concepts".
3. Provide realistic estimated study minutes (30-90 min).

Return ONLY valid json matching this TypeScript shape:
{
  "modules": Array<{
    "title": string,
    "description": string,
    "estimated_minutes": number,
    "topics": Array<{
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "key_concepts": string[],
      "resources": Array<{ "kind": "video"|"article"|"docs"|"practice", "title": string, "note"?: string }>
    }>
  }>
}`;

    const raw = await callAI(
      [
        { role: "system", content: "You are a master curriculum designer. You design in-depth follow-up modules to complete a student's learning roadmap." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 8192, jsonMode: true }
    );

    const parsed = safeJsonParse(raw);
    const roadmapData = extractRoadmapData(parsed);

    const createdModuleIds: string[] = [];
    for (const [idx, mod] of roadmapData.modules.entries()) {
      const { data: modRow, error: modErr } = await supabase
        .from("roadmap_modules")
        .insert({
          user_id: userId,
          goal_id: goal.id,
          ordinal: nextOrdinal + idx,
          title: mod.title,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
        })
        .select("id")
        .single();

      if (modErr || !modRow) continue;
      createdModuleIds.push(modRow.id);

      const topicRows = mod.topics.map((t, ti) => ({
        user_id: userId,
        goal_id: goal.id,
        module_id: modRow.id,
        ordinal: ti,
        title: t.title,
        description: t.description,
        estimated_minutes: t.estimated_minutes,
        key_concepts: t.key_concepts,
        resources: t.resources,
      }));
      await supabase.from("roadmap_topics").insert(topicRows);
    }

    return { addedCount: createdModuleIds.length };
  });

const addCustomModuleInput = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  topics: z.array(z.string().min(1).max(200)).min(1).max(20),
});

export const addCustomModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => addCustomModuleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("roadmap_modules")
      .select("ordinal")
      .eq("goal_id", data.goalId)
      .order("ordinal", { ascending: false })
      .limit(1);

    const nextOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

    const { data: modRow, error: modErr } = await supabase
      .from("roadmap_modules")
      .insert({
        user_id: userId,
        goal_id: data.goalId,
        ordinal: nextOrdinal,
        title: data.title,
        description: data.description || "Custom module added by student",
        estimated_minutes: data.topics.length * 30,
      })
      .select("id")
      .single();

    if (modErr || !modRow) throw new Error(modErr?.message ?? "Failed to add module");

    const topicRows = data.topics.map((tTitle, ti) => ({
      user_id: userId,
      goal_id: data.goalId,
      module_id: modRow.id,
      ordinal: ti,
      title: tTitle.trim(),
      description: `Study of ${tTitle.trim()}`,
      estimated_minutes: 30,
      key_concepts: [tTitle.trim()],
      resources: [{ kind: "practice" as const, title: `${tTitle.trim()} Exercises` }],
    }));

    const { error: tErr } = await supabase.from("roadmap_topics").insert(topicRows);
    if (tErr) throw new Error(tErr.message);

    return { moduleId: modRow.id };
  });

const addCustomTopicInput = z.object({
  goalId: z.string().uuid(),
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  estimatedMinutes: z.number().int().min(5).max(300).optional(),
});

export const addCustomTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => addCustomTopicInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("roadmap_topics")
      .select("ordinal")
      .eq("module_id", data.moduleId)
      .order("ordinal", { ascending: false })
      .limit(1);

    const nextOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

    const { data: topic, error } = await supabase
      .from("roadmap_topics")
      .insert({
        user_id: userId,
        goal_id: data.goalId,
        module_id: data.moduleId,
        ordinal: nextOrdinal,
        title: data.title.trim(),
        description: data.description?.trim() || `Deep-dive topic for ${data.title.trim()}`,
        estimated_minutes: data.estimatedMinutes ?? 30,
        key_concepts: [data.title.trim()],
        resources: [{ kind: "practice" as const, title: `${data.title.trim()} Practice Problem` }],
      })
      .select("id")
      .single();

    if (error || !topic) throw new Error(error?.message ?? "Failed to add topic");
    return { topicId: topic.id };
  });

const tutorInput = z.object({
  topicId: z.string().uuid().nullable().optional(),
  question: z.string().min(1).max(2000),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => tutorInput.parse(input))
  .handler(async ({ data, context }) => {
    let topicContext = "";
    if (data.topicId) {
      const { data: topic } = await context.supabase
        .from("roadmap_topics")
        .select("title, description, key_concepts, goal_id, goals(title)")
        .eq("id", data.topicId)
        .maybeSingle();
      if (topic) {
        topicContext = `Current goal: ${(topic as unknown as { goals?: { title: string } }).goals?.title ?? ""}
Current topic: ${topic.title}
Topic overview: ${topic.description ?? ""}
Key concepts: ${(topic.key_concepts as string[])?.join(", ") ?? ""}`;
      }
    }

    const answer = await callTutor([
      {
        role: "system",
        content: `You are StudyVerse Tutor: a concise, patient teacher. Give short, structured explanations with examples. Use markdown. If context is provided, tailor your answer to that topic and goal.

${topicContext}`,
      },
      { role: "user", content: data.question },
    ]);

    // Log AI Tutor interaction for instructor & admin telemetry
    try {
      await context.supabase.from("ai_tutor_logs").insert({
        user_id: context.userId,
        topic_id: data.topicId ?? null,
        user_question: data.question,
        ai_answer: answer.slice(0, 500),
      });
    } catch {
      /* Logged gracefully */
    }

    return { answer };
  });

const quizInput = z.object({
  topicId: z.string().uuid(),
  forceRegenerate: z.boolean().optional(),
});

export const generateQuizForTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => quizInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check if quiz already exists
    const { data: existing } = await supabase
      .from("quizzes")
      .select("id, title, questions")
      .eq("topic_id", data.topicId)
      .maybeSingle();

    if (existing && !data.forceRegenerate) return existing;

    const { data: topic } = await supabase
      .from("roadmap_topics")
      .select("title, description, key_concepts")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    const prompt = `Create an 8-question adaptive quiz for: "${topic.title}".
Description: ${topic.description ?? ""}
Key concepts: ${(topic.key_concepts as string[])?.join(", ") ?? ""}

Include a mix of difficulty levels: 3 easy, 3 medium, 2 hard.
Each question must test a different concept or angle — no two questions should test the same thing.

Return ONLY valid JSON array matching this exact shape:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Clear explanation of why this answer is correct."
  }
]`;

    const raw = await callAI([
      { role: "system", content: "You produce high quality multiple choice quiz JSON arrays. Always return exactly the number of questions requested." },
      { role: "user", content: prompt },
    ]);

    const questions = safeJsonParse<any[]>(raw);

    if (existing && data.forceRegenerate) {
      const { data: updated, error } = await supabase
        .from("quizzes")
        .update({
          questions,
          title: `${topic.title} — Quiz`,
        })
        .eq("id", existing.id)
        .select("id, title, questions")
        .single();
      if (error || !updated) throw new Error(error?.message ?? "Failed to update quiz");
      return updated;
    }

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        user_id: userId,
        topic_id: data.topicId,
        title: `${topic.title} — Quiz`,
        questions,
      })
      .select("id, title, questions")
      .single();

    if (error || !quiz) throw new Error(error?.message ?? "Failed to save quiz");
    return quiz;
  });

// ── Generate More Quiz Questions (avoids repeats) ──────────────────────────
const moreQuizInput = z.object({
  topicId: z.string().uuid(),
  existingQuestionTexts: z.array(z.string()),
});

export const generateMoreQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => moreQuizInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: topic } = await supabase
      .from("roadmap_topics")
      .select("title, description, key_concepts")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    const avoidList = data.existingQuestionTexts
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const prompt = `Create 6 NEW multiple-choice quiz questions for: "${topic.title}".
Description: ${topic.description ?? ""}
Key concepts: ${(topic.key_concepts as string[])?.join(", ") ?? ""}

IMPORTANT: The student has already answered these questions. Do NOT repeat or rephrase any of them:
${avoidList}

Generate 6 completely fresh questions testing different aspects of the topic.
Include a mix of difficulty: 2 easy, 2 medium, 2 hard.

Return ONLY valid JSON array matching this exact shape:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Clear explanation of why this answer is correct."
  }
]`;

    const raw = await callAI([
      { role: "system", content: "You produce high quality multiple choice quiz JSON arrays. Never repeat questions the student has already seen." },
      { role: "user", content: prompt },
    ]);

    const questions = safeJsonParse<any[]>(raw);

    return { questions };
  });

// ── Save Quiz Attempt (score persistence) ──────────────────────────────────
const attemptInput = z.object({
  quizId: z.string().uuid(),
  scorePercentage: z.number().min(0).max(100),
  userAnswers: z.record(z.unknown()),
});

export const saveQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => attemptInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const roundedScore = Math.round(data.scorePercentage);

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quizId,
        user_id: userId,
        score_percentage: roundedScore,
        user_answers: data.userAnswers as any,
      })
      .select("id, score_percentage, completed_at")
      .single();

    if (error) {
      console.error("Supabase error saving quiz attempt:", error);
      throw new Error(error.message);
    }

    if (!attempt) throw new Error("Failed to save quiz attempt");
    return attempt;
  });

const flashcardsInput = z.object({
  topicId: z.string().uuid(),
});

export const generateFlashcardsForTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => flashcardsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check existing
    const { data: existing } = await supabase
      .from("flashcards")
      .select("id, front, back, box, next_review_at")
      .eq("topic_id", data.topicId);

    if (existing && existing.length > 0) return existing;

    const { data: topic } = await supabase
      .from("roadmap_topics")
      .select("title, description, key_concepts")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    const prompt = `Create 5 flashcards for spaced repetition study of: "${topic.title}".
Key concepts: ${(topic.key_concepts as string[])?.join(", ") ?? ""}

Return ONLY valid JSON array matching:
[
  { "front": "Concept / Question", "back": "Clear concise answer / formula / explanation" }
]`;

    const raw = await callAI([
      { role: "system", content: "You produce concise flashcard question-answer JSON arrays." },
      { role: "user", content: prompt },
    ]);

    const cards: Array<{ front: string; back: string }> = safeJsonParse(raw);

    const rows = cards.map((c) => ({
      user_id: userId,
      topic_id: data.topicId,
      front: c.front,
      back: c.back,
      box: 1,
    }));

    const { data: inserted, error } = await supabase
      .from("flashcards")
      .insert(rows)
      .select("id, front, back, box, next_review_at");

    if (error) throw new Error(error.message);
    return inserted ?? [];
  });

import { getGroundedContext } from "./rag.server";

const generateNotesInput = z.object({
  topicId: z.string().uuid(),
});

export const generateSmartNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => generateNotesInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: topic } = await supabase
      .from("roadmap_topics")
      .select("id, title, description, key_concepts, module_id, roadmap_modules(title, goal_id, goals(title, level, category))")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    const goalTitle = (topic as any)?.roadmap_modules?.goals?.title ?? "Computer Science & Engineering";
    const moduleTitle = (topic as any)?.roadmap_modules?.title ?? "Core Module";
    const learnerLevel = (topic as any)?.roadmap_modules?.goals?.level ?? "intermediate";

    // Fetch grounded document chunks if available
    const groundedDocs = await getGroundedContext(supabase, userId, data.topicId, topic.title);
    const contextBlock = groundedDocs ? `\n\n### Grounded Source Material:\n${groundedDocs}` : "";

    const prompt = `You are a world-renowned university computer science professor and senior staff engineer authoring a masterclass textbook lesson for:
Subject / Goal: "${goalTitle}"
Module / Chapter: "${moduleTitle}"
Topic / Lesson: "${topic.title}"
Learner Target Level: ${learnerLevel}
Topic Overview: ${topic.description ?? ""}
Key concepts to rigorously cover: ${(topic.key_concepts as string[])?.join(", ") ?? topic.title}${contextBlock}

CRITICAL PEDAGOGICAL DIRECTIVE:
Produce comprehensive, deep, publication-grade study notes in GitHub Markdown. Do NOT generate superficial summaries or shallow bullet points. Cover the subject with true mathematical and engineering rigor, leaving no ambiguities.

STRUCTURE YOUR NOTES INTO THE FOLLOWING SECTIONS:

### 1. 📌 Conceptual Foundations & Intuitive Mental Model
- The Core Problem: Why does this concept exist? What exact computational or conceptual bottleneck does it solve?
- The Naive / Brute-Force Solution & Why It Breaks Down (explain space/time or physical bottlenecks).
- The Breakthrough Insight: Provide a vivid, real-world analogy or visual mental model explaining the core intuition.

### 2. 🔬 Under-The-Hood Architecture & Mechanical Invariants
- Step-by-step breakdown of how data structures / state machines / mathematical invariants operate under the hood.
- Memory Layout & References: How pointers, nodes, array buffers, or stack frames are positioned.
- State Invariants: What condition must always remain true before and after each operation?

### 3. 📊 Visual Concept Flowchart
Provide a strict, valid Mermaid.js diagram inside a \`\`\`mermaid codeblock!
MERMAID SYNTAX RULES:
* Start with: flowchart TD
* ALWAYS wrap ALL node labels in double quotes: e.g., A["Unvisited Set"] --> B["Extract Min O(log V)"].
* Use ONLY valid connectors: '-->' or '-.->'. NEVER use '.->'.
* Connect node to node (e.g., A --> B). Do NOT connect subgraphs directly.

### 4. 🎬 Interactive Step-by-Step Simulation Script
Provide an interactive simulation in a \`\`\`animation codeblock with a 5 to 8 step JSON script matching:
\`\`\`animation
{
  "title": "${topic.title} Step-by-Step Visual Simulation",
  "subject": "cs",
  "type": "process_steps",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Initialization & State Setup",
      "description": "Explaining initial state and setup parameters...",
      "keyTakeaway": "Initial conditions define the starting state.",
      "stateVars": { "State": "Init", "Value": 0 },
      "activeStageId": "step1",
      "stages": [
        { "id": "step1", "label": "1. Setup" },
        { "id": "step2", "label": "2. Process" },
        { "id": "step3", "label": "3. Evaluate" },
        { "id": "step4", "label": "4. Final" }
      ]
    },
    {
      "stepNumber": 2,
      "title": "Core Operation Transition",
      "description": "Explaining the first state transition...",
      "keyTakeaway": "State updates reflect the algorithmic step.",
      "stateVars": { "State": "Active", "Value": 1 },
      "activeStageId": "step2",
      "stages": [
        { "id": "step1", "label": "1. Setup" },
        { "id": "step2", "label": "2. Process" },
        { "id": "step3", "label": "3. Evaluate" },
        { "id": "step4", "label": "4. Final" }
      ]
    }
  ]
}
\`\`\`
(Set "subject" to "cs", "math", "physics", "chem", or "bio" based on the topic. Provide at least 5 detailed steps!)

### 5. 💻 Production-Grade Code Walkthrough & Implementation
- Provide a clean, robust, production-quality implementation in a fenced code block with language tag (\`\`\`python, \`\`\`cpp, \`\`\`java, or \`\`\`typescript).
- Include line-by-line comments explaining key logic, pointer manipulations, and boundary conditions.
- Highlight base cases, termination conditions, and error handling.

### 6. ⚖️ Complexity & Performance Trade-Off Matrix
Include a Markdown comparison table:
| Metric | Complexity | Explanation / Mechanism |
| :--- | :--- | :--- |
| **Best Case Time** | $O(...)$ | Scenario when this occurs |
| **Average Case Time** | $O(...)$ | Mathematical expectation |
| **Worst Case Time** | $O(...)$ | Worst-case input permutation |
| **Auxiliary Space** | $O(...)$ | Stack frames, recursion, auxiliary arrays |
| **Cache Locality** | High / Medium / Low | Memory access pattern efficiency |

### 7. ⚠️ Critical Pitfalls, Edge Cases & Bug Traps
Provide 3 to 4 specific failure modes that trap students in exams or production using callouts:
> ⚠️ Common Bug Trap: [Describe the trap, e.g. off-by-one, integer overflow, cycle detection, empty input, disconnected components]
> 💡 Pro Tip: [How seasoned engineers or competitive programmers avoid this]

### 8. 🎯 Battle-Tested Problem Patterns & Solution Blueprints
Provide 2 classic benchmark problem patterns (e.g. LeetCode / Standard Exam questions) that test this topic:
- **Problem 1 Name & Pattern**: Problem premise, algorithmic blueprint, and strategic thought process.
- **Problem 2 Name & Pattern**: Problem premise, algorithmic blueprint, and strategic thought process.

### 9. 🏢 Real-World Industry Application & Engineering Case Study
- How production systems (e.g., Linux Kernel, Redis, PostgreSQL, Chromium, Git, Kafka, or distributed file systems) rely on this concept at scale.
- Practical hardware, networking, or memory trade-offs observed in mission-critical environments.

### 10. 💡 Active Recall & Self-Check
Provide 2 to 3 conceptual and algorithmic challenge questions. For each question, provide a collapsible reveal for the solution and explanation:
<details>
<summary>💡 Question 1: [Short Question Hook] - Reveal Solution & Proof</summary>
[Explain the step-by-step reasoning, mathematical proof, or code deduction clearly here]
</details>

${groundedDocs ? "### 11. 📚 Grounded Source Citations\nList exact source documents and page references from the material above." : ""}`;

    const content = await callAI(
      [
        { role: "system", content: "You are a master educator and staff engineer authoring world-class, deep study notes with valid Mermaid.js diagrams and interactive step-by-step animations. Never cut corners or omit details." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 8192 }
    );

    const { data: note, error } = await supabase
      .from("notes")
      .upsert(
        { user_id: userId, topic_id: data.topicId, ai_summary: content },
        { onConflict: "user_id,topic_id" }
      )
      .select("id, content, ai_summary")
      .single();

    if (error || !note) throw new Error(error?.message ?? "Failed to save notes");
    return { id: note.id, content: note.ai_summary ?? note.content };
  });
