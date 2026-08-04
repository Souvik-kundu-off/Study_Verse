import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Megaphone, CheckCircle2, Flame, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NotificationPopoverProps {
  userId: string;
  role?: string | null;
}

export function NotificationPopover({ userId, role }: NotificationPopoverProps) {
  const [unreadCount, setUnreadCount] = useState(1);

  // Fetch admin broadcast system announcement
  const { data: announcement } = useQuery({
    queryKey: ["systemAnnouncement"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("system_settings")
        .select("value")
        .eq("key", "system_announcement")
        .maybeSingle();
      return data?.value as string | undefined;
    },
  });

  // Fetch profile for verification or streak alert
  const { data: profile } = useQuery({
    enabled: !!userId,
    queryKey: ["notificationProfile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, is_verified_instructor, role")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const isAdmin = role === "admin" || profile?.role === "admin";
  const isInstructor = role === "instructor" || profile?.role === "instructor";
  const isVerified = (profile as any)?.is_verified_instructor;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={() => setUnreadCount(0)}
          className="relative grid h-8 w-8 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 transition hover:bg-white hover:text-slate-900 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 rounded-2xl p-0 shadow-2xl border-slate-200/90 bg-white overflow-hidden" align="end" sideOffset={8}>
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900">Notifications Center</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
            System & Admin
          </span>
        </div>

        <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
          {/* Admin Broadcast Announcement */}
          {announcement ? (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
                <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                <span>Admin Announcement</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">{announcement}</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>No new platform announcements.</span>
            </div>
          )}

          {/* Instructor Verification Notification */}
          {isInstructor && (
            <div className={`p-3 rounded-xl border text-xs ${
              isVerified ? "bg-emerald-50/70 border-emerald-100" : "bg-amber-50/70 border-amber-100"
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <CheckCircle2 className={`h-3.5 w-3.5 ${isVerified ? "text-emerald-600" : "text-amber-600"}`} />
                <span className={isVerified ? "text-emerald-800" : "text-amber-800"}>
                  {isVerified ? "Verified Educator" : "Verification Status"}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {isVerified
                  ? "Your academic credentials are verified. Published courses are live."
                  : "Your verification request is undergoing administrator review."}
              </p>
            </div>
          )}

          {/* Student Streak Notification (Students Only) */}
          {!isAdmin && !isInstructor && profile && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
                <Flame className="h-3.5 w-3.5 text-amber-600" />
                <span>Daily Streak Notice</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                Current streak: <strong className="text-amber-900">{profile.current_streak ?? 0} days</strong>. Complete today's mission to extend!
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
