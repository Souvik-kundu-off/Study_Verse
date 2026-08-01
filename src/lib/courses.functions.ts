import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateRoadmap } from "./ai.functions";

const createCourseInput = z.object({
  title: z.string().min(2).max(200),
  degreeProgram: z.string().min(2).default("B.Tech CSE"),
  semester: z.string().min(2).default("Semester 7"),
  category: z.string().default("Computer Science"),
  description: z.string().optional(),
  syllabusText: z.string().optional(),
});

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createCourseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check if user has permission to create courses
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const role = profile?.role ?? "student";
    if (role !== "instructor" && role !== "admin") {
      throw new Error("Only Instructors and Admins can create official courses.");
    }

    // Create course record
    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        instructor_id: userId,
        title: data.title,
        degree_program: data.degreeProgram,
        semester: data.semester,
        category: data.category,
        description: data.description ?? `Official course for ${data.degreeProgram} — ${data.semester}`,
        status: "published",
      })
      .select("id, title, degree_program, semester, category, status")
      .single();

    if (error || !course) throw new Error(error?.message ?? "Failed to create course");

    // Auto-generate course roadmap modules using AI
    try {
      const roadmap = await generateRoadmap({
        data: {
          goalTitle: data.title,
          description: data.description,
          category: data.category,
          level: "intermediate",
          minutesPerDay: 45,
          syllabusText: data.syllabusText,
        },
      });

      // Insert modules linked to course_id
      const { data: createdGoal } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", userId)
        .eq("title", data.title)
        .maybeSingle();

      if (createdGoal) {
        await supabase
          .from("roadmap_modules")
          .update({ course_id: course.id })
          .eq("goal_id", createdGoal.id);
      }
    } catch {
      /* Course created silently */
    }

    return course;
  });

const enrollInput = z.object({
  courseId: z.string().uuid(),
});

export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => enrollInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();

    if (existing) return { success: true, message: "Already enrolled" };

    const { error } = await supabase.from("course_enrollments").insert({
      user_id: userId,
      course_id: data.courseId,
      progress_pct: 0,
    });

    if (error) throw new Error(`Enrollment failed: ${error.message}`);
    return { success: true };
  });

export const getCoursesCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title, degree_program, semester, category, description, level, status, created_at, instructor_id")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", userId);

    const enrolledSet = new Set(enrollments?.map((e) => e.course_id) ?? []);

    return (courses ?? []).map((c) => ({
      ...c,
      isEnrolled: enrolledSet.has(c.id),
    }));
  });

const updateRoleInput = z.object({
  role: z.enum(["student", "instructor", "admin"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ role: data.role })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { role: data.role };
  });
