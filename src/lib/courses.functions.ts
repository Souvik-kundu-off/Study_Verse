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

const updateCourseInput = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).optional(),
  degreeProgram: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const updateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateCourseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check course ownership or admin role
    const { data: course } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", data.courseId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    if (!course || (course.instructor_id !== userId && !isAdmin)) {
      throw new Error("Access Denied: You do not own this course and cannot edit it.");
    }

    const updates: {
      title?: string;
      degree_program?: string;
      category?: string;
      description?: string;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (data.title) updates.title = data.title;
    if (data.degreeProgram) updates.degree_program = data.degreeProgram;
    if (data.category) updates.category = data.category;
    if (data.description) updates.description = data.description;

    const { error } = await (supabase.from as any)("courses")
      .update(updates)
      .eq("id", data.courseId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

const enrollInput = z.object({
  courseId: z.string().uuid(),
});

async function copyOrGenerateCourseModules(supabase: any, userId: string, goalId: string, course: any) {
  // Check if course has modules created by teacher
  const { data: courseModules } = await supabase
    .from("roadmap_modules")
    .select("id, title, description, ordinal, estimated_minutes")
    .eq("course_id", course.id);

  if (courseModules && courseModules.length > 0) {
    for (const mod of courseModules) {
      const { data: newMod } = await supabase
        .from("roadmap_modules")
        .insert({
          user_id: userId,
          goal_id: goalId,
          course_id: course.id,
          title: mod.title,
          description: mod.description,
          ordinal: mod.ordinal,
          estimated_minutes: mod.estimated_minutes,
        })
        .select("id")
        .single();

      if (newMod) {
        const { data: topics } = await supabase
          .from("roadmap_topics")
          .select("title, description, estimated_minutes, key_concepts, resources, ordinal")
          .eq("module_id", mod.id);

        if (topics && topics.length > 0) {
          await supabase.from("roadmap_topics").insert(
            topics.map((t: any) => ({
              user_id: userId,
              goal_id: goalId,
              module_id: newMod.id,
              title: t.title,
              description: t.description,
              estimated_minutes: t.estimated_minutes,
              key_concepts: t.key_concepts,
              resources: t.resources,
              ordinal: t.ordinal,
              status: "not_started",
            }))
          );
        }
      }
    }
  } else {
    // If course has no pre-built modules, generate AI curriculum directly FOR THIS goalId
    try {
      const mod1Title = `Foundations of ${course.title}`;
      const { data: modRow } = await supabase
        .from("roadmap_modules")
        .insert({
          user_id: userId,
          goal_id: goalId,
          course_id: course.id,
          ordinal: 0,
          title: mod1Title,
          description: `Key principles and core concepts of ${course.title}.`,
          estimated_minutes: 120,
        })
        .select("id")
        .single();

      if (modRow) {
        await supabase.from("roadmap_topics").insert([
          {
            user_id: userId,
            goal_id: goalId,
            module_id: modRow.id,
            ordinal: 0,
            title: `${course.title} — Key Principles & Architecture`,
            description: `Comprehensive overview of ${course.title} principles and core methodology.`,
            estimated_minutes: 45,
            key_concepts: ["Core Definitions", "Primary Architecture", "Practical Applications"],
            status: "not_started",
          },
          {
            user_id: userId,
            goal_id: goalId,
            module_id: modRow.id,
            ordinal: 1,
            title: `${course.title} — Practice Problems & Exercises`,
            description: `Hands-on problem solving and algorithmic/conceptual exercises.`,
            estimated_minutes: 60,
            key_concepts: ["Practice Problems", "Optimization Techniques", "Case Studies"],
            status: "not_started",
          },
        ]);
      }
    } catch {
      /* Handled gracefully */
    }
  }
}

export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => enrollInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check course details
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("id, title, category, description, level")
      .eq("id", data.courseId)
      .single();

    if (cErr || !course) throw new Error("Course not found");

    // Insert course enrollment
    const { data: existing } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("course_enrollments").insert({
        user_id: userId,
        course_id: data.courseId,
        progress_pct: 0,
      });
    }

    // Check if user already has a goal for this course
    const { data: existingGoal } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", userId)
      .eq("title", course.title)
      .maybeSingle();

    if (existingGoal) {
      // Set all user goals inactive and activate this course goal
      await supabase.from("goals").update({ is_active: false }).eq("user_id", userId);
      await supabase.from("goals").update({ is_active: true }).eq("id", existingGoal.id);

      // Check if topics exist for this goal
      const { count } = await supabase
        .from("roadmap_topics")
        .select("id", { count: "exact", head: true })
        .eq("goal_id", existingGoal.id);

      if (!count || count === 0) {
        await copyOrGenerateCourseModules(supabase, userId, existingGoal.id, course);
      }

      return { success: true, goalId: existingGoal.id };
    }

    // Set other goals inactive and create student goal for this course
    await supabase.from("goals").update({ is_active: false }).eq("user_id", userId);

    const { data: goal, error: gErr } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: course.title,
        category: course.category ?? "Computer Science",
        description: course.description,
        level: course.level ?? "intermediate",
        minutes_per_day: 45,
        is_active: true,
      })
      .select("id")
      .single();

    if (gErr || !goal) throw new Error("Failed to provision learning track for course");

    // Copy or generate modules for the new goal
    await copyOrGenerateCourseModules(supabase, userId, goal.id, course);

    return { success: true, goalId: goal.id };
  });

export const getCoursesCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Select courses with profile join
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title, degree_program, semester, category, description, level, status, created_at, instructor_id, profiles(full_name, institution_name, academic_title, specialization, is_verified_instructor)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    let finalCourses = courses;

    // Fallback if strict relation syntax fails
    if (error || !finalCourses) {
      const { data: fallbackCourses, error: fbErr } = await supabase
        .from("courses")
        .select("id, title, degree_program, semester, category, description, level, status, created_at, instructor_id")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (fbErr) throw new Error(fbErr.message);
      finalCourses = fallbackCourses as any;
    }

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", userId);

    const enrolledSet = new Set(enrollments?.map((e) => e.course_id) ?? []);

    return (finalCourses ?? []).map((c: any) => ({
      ...c,
      isEnrolled: enrolledSet.has(c.id),
      instructorName: c.profiles?.full_name ?? "University Professor",
      institutionName: c.profiles?.institution_name ?? "Academic Institution",
      academicTitle: c.profiles?.academic_title ?? "Instructor",
      isVerifiedInstructor: c.profiles?.is_verified_instructor ?? false,
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

const instructorProfileInput = z.object({
  institutionName: z.string().optional(),
  academicTitle: z.string().optional(),
  specialization: z.string().optional(),
  experienceYears: z.number().optional(),
  bio: z.string().optional(),
});

export const updateInstructorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => instructorProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const updates: Record<string, any> = {
      is_verified_instructor: true,
    };
    if (data.institutionName) updates.institution_name = data.institutionName;
    if (data.academicTitle) updates.academic_title = data.academicTitle;
    if (data.specialization) updates.specialization = data.specialization;
    if (data.experienceYears) updates.teaching_experience_years = data.experienceYears;
    if (data.bio) updates.bio = data.bio;

    const { error } = await (supabase.from as any)("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
