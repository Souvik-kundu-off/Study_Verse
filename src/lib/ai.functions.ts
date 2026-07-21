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
      maxItems: 8,
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
            minItems: 3,
            maxItems: 8,
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

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roadmapInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable");

    const prompt = `Design a focused learning roadmap for a ${data.level} learner.

Goal: ${data.goalTitle}
${data.description ? `Context: ${data.description}` : ""}
${data.category ? `Category: ${data.category}` : ""}
${data.deadline ? `Deadline: ${data.deadline}` : "No hard deadline"}
Available study time: ${data.minutesPerDay} minutes/day
Preferred learning style: ${data.learningStyle ?? "mixed"}

Design 4-6 progressive modules, each with 3-6 topics. For each topic give a 1-2 sentence description, estimated study minutes, 3-5 key concepts, and 2-4 recommended resource types (video, article, docs, practice). Be concrete and specific to the goal. Do not include external URLs.

Return ONLY valid json matching this TypeScript shape (no markdown, no commentary):
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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a world-class learning designer. You produce concise, structured study roadmaps as strict json.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      throw new Error(`AI request failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const payload = await res.json();
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as RoadmapAI;

    // Persist to DB as this user
    const { supabase, userId } = context;

    // Deactivate existing active goals
    await supabase.from("goals").update({ is_active: false }).eq("user_id", userId);

    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: data.goalTitle,
        description: data.description ?? parsed.overview,
        category: data.category,
        level: data.level,
        minutes_per_day: data.minutesPerDay,
        deadline: data.deadline ?? null,
        learning_style: data.learningStyle,
        is_active: true,
      })
      .select("id")
      .single();
    if (goalErr || !goal) throw new Error(goalErr?.message ?? "Failed to save goal");

    for (const [mi, mod] of parsed.modules.entries()) {
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

    return { goalId: goal.id, overview: parsed.overview };
  });

const tutorInput = z.object({
  topicId: z.string().uuid().nullable().optional(),
  question: z.string().min(1).max(2000),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tutorInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable");

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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are StudyVerse Tutor: a concise, patient teacher. Give short, structured explanations with examples. Use markdown. If context is provided, tailor your answer to that topic and goal.

${topicContext}`,
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI request failed: ${res.status}`);
    }
    const payload = await res.json();
    const answer: string = payload.choices?.[0]?.message?.content ?? "";
    return { answer };
  });
