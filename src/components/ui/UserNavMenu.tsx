import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldCheck, ChevronDown, User, Sliders, Settings } from "lucide-react";

interface UserNavMenuProps {
  email: string;
  fullName?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  onOpenSettings: (tab: "profile" | "study" | "verification" | "notifications") => void;
  onSignOut: () => void;
}

export function UserNavMenu({ email, fullName, role, avatarUrl, onOpenSettings, onSignOut }: UserNavMenuProps) {
  const displayName = fullName || email.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isAdmin = role === "admin";
  const isInstructor = role === "instructor";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 p-1 pr-2.5 shadow-2xs transition hover:bg-white hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
          <Avatar className="h-7 w-7 border border-slate-200">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-blue-600 font-semibold text-[11px] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 rounded-xl p-1.5 shadow-xl border-slate-200/90 bg-white" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold leading-none text-slate-900 truncate">{displayName}</p>
              {isAdmin ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  Admin
                </span>
              ) : isInstructor ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Teacher
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Student
                </span>
              )}
            </div>
            <p className="text-[11px] leading-none text-slate-500 truncate">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100" />
        
        <DropdownMenuGroup>
          {/* My Profile */}
          <DropdownMenuItem
            onClick={() => onOpenSettings("profile")}
            className="rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:bg-slate-100"
          >
            <User className="mr-2 h-4 w-4 text-blue-600" />
            <span>My Profile</span>
          </DropdownMenuItem>

          {/* Student Specific: My Study Preferences */}
          {!isAdmin && !isInstructor && (
            <DropdownMenuItem
              onClick={() => onOpenSettings("study")}
              className="rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:bg-slate-100"
            >
              <Sliders className="mr-2 h-4 w-4 text-emerald-600" />
              <span>My Study Preferences</span>
            </DropdownMenuItem>
          )}

          {/* Teacher Specific: Verification */}
          {isInstructor && (
            <DropdownMenuItem
              onClick={() => onOpenSettings("verification")}
              className="rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:bg-slate-100"
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
              <span>Verification</span>
            </DropdownMenuItem>
          )}

          {/* Common: Settings */}
          <DropdownMenuItem
            onClick={() => onOpenSettings("notifications")}
            className="rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:bg-slate-100"
          >
            <Settings className="mr-2 h-4 w-4 text-slate-500" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem
          onClick={onSignOut}
          className="rounded-lg text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-500" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
