import { cn } from "@/src/lib/utils";
import { LogIn, LogOut, Settings, X } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";

interface NavigationProps {
  view: "home" | "history";
  storyExists: boolean;
  onViewChange: (view: "home" | "history") => void;
  onHomeClick: () => void;
  user: ReturnType<typeof useAuth>["user"];
  signIn: ReturnType<typeof useAuth>["signIn"];
  signOut: ReturnType<typeof useAuth>["signOut"];
  setShowAuthModal: (show: boolean) => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Navigation({
  view,
  storyExists,
  onViewChange,
  onHomeClick,
  user,
  signIn,
  signOut,
  setShowAuthModal,
  sidebarOpen,
  onToggleSidebar,
}: NavigationProps) {
  return (
    <nav id="top-nav" className="h-14 md:h-16 border-b border-slate-800 flex items-center justify-between px-3 md:px-8 bg-[#1E293B] shrink-0">
      <div className="flex items-center gap-2">
        {/* Mobile sidebar toggle */}
        {storyExists && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
          {sidebarOpen ? <X size={20} /> : <Settings size={20} />}
          </button>
        )}
        <div id="nav-brand" className="flex items-center gap-2 cursor-pointer" onClick={onHomeClick}>
          <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-xs md:text-sm">VN</div>
          <span className="text-base md:text-xl font-semibold tracking-tight">
            <span className="hidden xs:inline">Linh Ngữ AI </span>
            <span className="text-indigo-400">v2.0</span>
          </span>
        </div>
      </div>

      {/* Desktop nav actions */}
      <div id="nav-actions" className="hidden md:flex items-center gap-6 text-sm text-slate-400">
        <span
          id="nav-btn-history"
          className={cn("hover:text-white cursor-pointer transition-colors", view === "history" && "text-indigo-400 font-medium")}
          onClick={() => {
            if (!user) {
              setShowAuthModal(true);
            } else {
              onViewChange("history");
            }
          }}
        >
          Lịch sử đọc
        </span>
        <span
          id="nav-btn-convert"
          className={cn(
            "hover:text-white cursor-pointer transition-colors font-medium",
            !storyExists ? "text-indigo-400" : "text-indigo-400",
          )}
          onClick={onHomeClick}
        >
          Chuyển ngữ URL
        </span>
        <span id="nav-badge-plan" className="text-xs bg-slate-700 px-2 py-1 rounded">
          {user ? "Premium Plan" : "Free Plan"}
        </span>
        {user ? (
          <div className="flex items-center gap-2">
            <div
              id="nav-user"
              className="w-8 h-8 rounded-full bg-indigo-600 border border-slate-500 flex items-center justify-center overflow-hidden"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Settings size={14} className="text-white" />
              )}
            </div>
            <button onClick={signOut} className="hover:text-white transition-colors" title="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-colors"
          >
            <LogIn size={14} /> Đăng nhập
          </button>
        )}
      </div>

      {/* Mobile nav actions - compact */}
      <div className="flex md:hidden items-center gap-2 text-slate-400">
        <button
          onClick={() => {
            if (!user) {
              setShowAuthModal(true);
            } else {
              onViewChange(view === "history" ? "home" : "history");
            }
          }}
          className="p-2 hover:text-white transition-colors text-xs"
        >
          {view === "history" ? "Trang chủ" : "Lịch sử"}
        </button>
        {user ? (
          <button onClick={signOut} className="p-2 hover:text-white transition-colors" title="Đăng xuất">
            <LogOut size={16} />
          </button>
        ) : (
          <button
            onClick={signIn}
            className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors"
          >
            <LogIn size={14} />
          </button>
        )}
      </div>
    </nav>
  );
}
