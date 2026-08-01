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

async function callGroq(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Groq rate limit reached. Please wait a moment and try again.");
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const payload = await res.json();
  return payload.choices?.[0]?.message?.content ?? "";
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
    "v1beta/models/gemini-2.0-flash:generateContent",
    "v1/models/gemini-2.0-flash:generateContent",
    "v1beta/models/gemini-2.0-flash-lite:generateContent",
    "v1/models/gemini-2.0-flash-lite:generateContent",
  ];

  let lastErr = "";
  for (const path of candidates) {
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
    if (res.status === 429) throw new Error("Gemini rate limit reached. Please wait 30 seconds.");
    if (res.status !== 404) throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
    lastErr = `404 for ${path}`;
  }

  throw new Error(`Gemini: no available model found. ${lastErr}`);
}

async function callLovableGateway(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI request failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const payload = await res.json();
  return payload.choices?.[0]?.message?.content ?? "";
}

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;

  // 1. Groq — free tier: 30 req/min, 14,400 req/day, no credit card needed
  if (groqKey) {
    return callGroq(messages, groqKey);
  }

  // 2. Gemini — Google AI Studio key
  if (geminiKey) {
    return callGemini(messages, geminiKey);
  }

  // 3. Lovable gateway fallback
  if (lovableKey) {
    return callLovableGateway(messages, lovableKey);
  }

  throw new Error("No AI key configured. Add GROQ_API_KEY to your .env file (free at console.groq.com).");
}


export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => roadmapInput.parse(input))
  .handler(async ({ data, context }) => {
    const prompt = `Design a focused learning roadmap for a ${data.level} learner.

Goal: ${data.goalTitle}
${data.description ? `Context: ${data.description}` : ""}
${data.category ? `Category: ${data.category}` : ""}
${data.deadline ? `Deadline: ${data.deadline}` : "No hard deadline"}
Available study time: ${data.minutesPerDay} minutes/day
Preferred learning style: ${data.learningStyle ?? "mixed"}
${data.timeSlotPreference ? `Target Schedule Slot: ${data.timeSlotPreference}` : ""}
${data.syllabusText ? `CUSTOM SYLLABUS / MATERIAL PROVIDED BY USER:\n"""\n${data.syllabusText}\n"""\nCRITICAL INSTRUCTION: Strictly structure the modules and topics to reflect the chapters, topics, and key concepts in the user-provided syllabus above.` : ""}

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

    const raw = await callAI([
      { role: "system", content: "You are a world-class learning designer. You produce concise, structured study roadmaps as strict json." },
      { role: "user", content: prompt },
    ]);

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(jsonStr) as RoadmapAI;

    // Persist to DB as this user
    const { supabase, userId } = context;

    // Set other goals to non-active so this newly created goal is primary, but preserve them in DB for multi-track switching
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
        time_slot_preference: data.timeSlotPreference ?? "flexible",
        syllabus_text: data.syllabusText ?? null,
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

    const answer = await callAI([
      {
        role: "system",
        content: `You are StudyVerse Tutor: a concise, patient teacher. Give short, structured explanations with examples. Use markdown. If context is provided, tailor your answer to that topic and goal.

${topicContext}`,
      },
      { role: "user", content: data.question },
    ]);

    return { answer };
  });

const quizInput = z.object({
  topicId: z.string().uuid(),
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

    if (existing) return existing;

    const { data: topic } = await supabase
      .from("roadmap_topics")
      .select("title, description, key_concepts")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    const prompt = `Create a 4-question adaptive quiz for: "${topic.title}".
Description: ${topic.description ?? ""}
Key concepts: ${(topic.key_concepts as string[])?.join(", ") ?? ""}

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
      { role: "system", content: "You produce high quality multiple choice quiz JSON arrays." },
      { role: "user", content: prompt },
    ]);

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const questions = JSON.parse(cleaned);

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

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const cards: Array<{ front: string; back: string }> = JSON.parse(cleaned);

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
      .select("title, description, key_concepts")
      .eq("id", data.topicId)
      .single();

    if (!topic) throw new Error("Topic not found");

    // Fetch grounded document chunks if available
    const groundedDocs = await getGroundedContext(supabase, userId, data.topicId, topic.title);
    const contextBlock = groundedDocs ? `\n\n### Grounded Source Material:\n${groundedDocs}` : "";

    const prompt = `Write comprehensive, beautiful study notes in GitHub Markdown for topic: "${topic.title}".
Context: ${topic.description ?? ""}${contextBlock}
Key concepts to cover: ${(topic.key_concepts as string[])?.join(", ") ?? ""}

Include:
- 📌 Overview & Core Definition
- 🧠 Key Concepts & Formulas
- 📊 Visual Concept Flowchart using strict standard Mermaid syntax inside a \`\`\`mermaid codeblock!
- 🎬 Granular Interactive Step-by-Step Simulation using a \`\`\`animation codeblock with a 5 to 8 step JSON script matching:
\`\`\`animation
{
  "title": "${topic.title} Detailed Visual Simulation",
  "subject": "cs",
  "type": "process_steps",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Initialization & State Setup",
      "description": "Thoroughly explaining the initial variables, boundary conditions, and setup...",
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
      "title": "First Operation",
      "description": "Detailed explanation of step 2...",
      "keyTakeaway": "Key insight for step 2...",
      "stateVars": { "State": "Active", "Value": 10 },
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
- 💡 Real-world Analogy or Code Example
- 🎯 Exam / Interview Tip
${groundedDocs ? "- 📚 Source Page Citations referenced from the material above" : ""}`;

    const content = await callAI([
      { role: "system", content: "You are a master educator generating world-class study notes with valid Mermaid.js diagrams and interactive step-by-step animation scripts for CS, Math, Physics, Chemistry, and Biology." },
      { role: "user", content: prompt },
    ]);

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
