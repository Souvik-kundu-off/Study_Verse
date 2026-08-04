import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Sliders, ShieldCheck, Bell, Loader2, CheckCircle2, Clock, BookOpen, AlertCircle } from "lucide-react";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "study" | "verification" | "notifications";
  userId: string;
  userEmail: string;
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
  userId,
  userEmail,
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "study" | "verification" | "notifications">(initialTab);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // 1. Fetch Profile Data
  const { data: profile, isLoading: pLoading } = useQuery({
    enabled: isOpen && !!userId,
    queryKey: ["profileSettings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Active Goal for Student Study Preferences
  const { data: activeGoal } = useQuery({
    enabled: isOpen && !!userId && profile?.role === "student",
    queryKey: ["activeGoalSettings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("goals")
        .select("id, title, minutes_per_day, time_slot_preference")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  // Form states
  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [learningStyle, setLearningStyle] = useState("Mixed");
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [timeSlotPref, setTimeSlotPref] = useState("Morning");
  
  // Teacher verification fields
  const [institutionName, setInstitutionName] = useState("");
  const [academicTitle, setAcademicTitle] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [teachingExp, setTeachingExp] = useState(3);
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Notification Toggles
  const [dailyReminders, setDailyReminders] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);

  // Sync profile data into state when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setTargetExam(profile.target_exam ?? "");
      setLearningStyle(profile.preferred_learning_style ?? "Mixed");
      setInstitutionName((profile as any).institution_name ?? "");
      setAcademicTitle((profile as any).academic_title ?? "");
      setSpecialization((profile as any).specialization ?? "");
      setTeachingExp((profile as any).teaching_experience_years ?? 3);
      setBio((profile as any).bio ?? "");
      setPortfolioUrl((profile as any).portfolio_url ?? "");
    }
    if (activeGoal) {
      setMinutesPerDay(activeGoal.minutes_per_day ?? 60);
      setTimeSlotPref(activeGoal.time_slot_preference ?? "Morning");
    }
  }, [profile, activeGoal]);

  async function handleSave() {
    setSaving(true);
    try {
      // Update profiles table
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          target_exam: targetExam,
          preferred_learning_style: learningStyle,
          institution_name: institutionName,
          academic_title: academicTitle,
          specialization: specialization,
          teaching_experience_years: teachingExp,
          bio: bio,
          portfolio_url: portfolioUrl,
        } as any)
        .eq("id", userId);

      if (pErr) throw pErr;

      // If active goal exists and student, update goal preferences
      if (activeGoal?.id) {
        await supabase
          .from("goals")
          .update({
            minutes_per_day: minutesPerDay,
            time_slot_preference: timeSlotPref,
          } as any)
          .eq("id", activeGoal.id);
      }

      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["profileSettings"] });
      await qc.invalidateQueries({ queryKey: ["all-goals"] });

      toast.success("Settings saved successfully!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const isStudent = profile?.role === "student";
  const isInstructor = profile?.role === "instructor";
  const isVerified = (profile as any)?.is_verified_instructor;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-white border-slate-200 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Account & Preferences</span>
          </DialogTitle>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            <TabButton
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              icon={User}
              label="My Profile"
            />

            {isStudent && (
              <TabButton
                active={activeTab === "study"}
                onClick={() => setActiveTab("study")}
                icon={Sliders}
                label="Study Preferences"
              />
            )}

            {isInstructor && (
              <TabButton
                active={activeTab === "verification"}
                onClick={() => setActiveTab("verification")}
                icon={ShieldCheck}
                label="Verification Center"
                badge={isVerified ? "Verified" : "Pending"}
              />
            )}

            <TabButton
              active={activeTab === "notifications"}
              onClick={() => setActiveTab("notifications")}
              icon={Bell}
              label="Notifications"
            />
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {pLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm">Loading settings...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: Profile */}
              {activeTab === "profile" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Account Email
                    </label>
                    <input
                      type="text"
                      disabled
                      value={userEmail}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      {isInstructor ? "Bio / Headline" : "Target Goal / Exam Focus"}
                    </label>
                    <input
                      type="text"
                      value={isInstructor ? bio : targetExam}
                      onChange={(e) => isInstructor ? setBio(e.target.value) : setTargetExam(e.target.value)}
                      placeholder={isInstructor ? "e.g., Senior Computer Science Lecturer at MIT" : "e.g., GATE CS 2027, SAT Math, AWS Solutions Architect"}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Study Preferences (Students) */}
              {activeTab === "study" && isStudent && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Preferred Learning Style
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {["Mixed", "Visual", "Interactive", "Textual"].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setLearningStyle(style)}
                          className={`rounded-xl border p-3 text-center text-xs font-semibold transition cursor-pointer ${
                            learningStyle === style
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Daily Study Target (Minutes/Day)
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[30, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setMinutesPerDay(mins)}
                          className={`rounded-xl border p-3 text-center text-xs font-semibold transition cursor-pointer ${
                            minutesPerDay === mins
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {mins} mins
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Preferred Study Time Slot
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { id: "Morning", label: "Morning (6am-12pm)" },
                        { id: "Afternoon", label: "Afternoon (12pm-5pm)" },
                        { id: "Evening", label: "Evening (5pm-9pm)" },
                        { id: "Night", label: "Night (9pm-2am)" },
                      ].map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setTimeSlotPref(slot.id)}
                          className={`rounded-xl border p-3 text-center text-xs font-semibold transition cursor-pointer ${
                            timeSlotPref === slot.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {slot.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Verification Center (Teachers) */}
              {activeTab === "verification" && isInstructor && (
                <div className="space-y-5">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    isVerified
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    {isVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {isVerified ? "Verified Instructor Status" : "Verification Pending / Review Required"}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">
                        {isVerified
                          ? "Your instructor account is verified. You can publish courses to the global directory."
                          : "Submit your academic title and university/institution credentials to request official instructor verification."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Institution / University Name
                      </label>
                      <input
                        type="text"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. Stanford University"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Academic Title
                      </label>
                      <input
                        type="text"
                        value={academicTitle}
                        onChange={(e) => setAcademicTitle(e.target.value)}
                        placeholder="e.g. Associate Professor"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Subject Specialization
                      </label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Artificial Intelligence & Algorithms"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Teaching Experience (Years)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={teachingExp}
                        onChange={(e) => setTeachingExp(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Portfolio / Academic Website URL
                    </label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://scholar.google.com/..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: Notifications */}
              {activeTab === "notifications" && (
                <div className="space-y-4">
                  <NotificationToggle
                    title="Daily Mission Reminders"
                    description="Receive morning prompts for today's scheduled roadmap topics."
                    checked={dailyReminders}
                    onChange={setDailyReminders}
                  />

                  <NotificationToggle
                    title="Streak Protection Alerts"
                    description="Alerts when your daily study streak is at risk of resetting."
                    checked={streakAlerts}
                    onChange={setStreakAlerts}
                  />

                  <NotificationToggle
                    title="Course & System Updates"
                    description="Updates when new course materials or features become available."
                    checked={courseUpdates}
                    onChange={setCourseUpdates}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{saving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
        active
          ? "bg-blue-600 text-white shadow-2xs"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {badge && (
        <span className={`ml-1 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md ${
          active ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function NotificationToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
      <div>
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
          checked ? "bg-blue-600 justify-end" : "bg-slate-200 justify-start"
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
      </button>
    </div>
  );
}
