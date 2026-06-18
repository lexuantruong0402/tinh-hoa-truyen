import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import {
  ExternalLink,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  X,
} from "lucide-react";
import { Theme, FontType } from "@/src/types";

interface StorySidebarProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
  loading: boolean;
  isRefining: boolean;
  refinedContent: string;
  showRefined: boolean;
  onToggleAI: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  fontType: FontType;
  onFontTypeChange: (font: FontType) => void;
  fontSize: number;
  onFontSizeDecrease: () => void;
  onFontSizeIncrease: () => void;
  sidebarOpen?: boolean;
  onCloseSidebar?: () => void;
  autoRefine?: boolean;
  onAutoRefineChange?: (value: boolean) => void;
  aiMode?: "smooth" | "summarize";
  onAiModeChange?: (mode: "smooth" | "summarize") => void;
}

export default function StorySidebar({
  url,
  onUrlChange,
  onFetch,
  loading,
  isRefining,
  refinedContent,
  showRefined,
  onToggleAI,
  theme,
  onThemeChange,
  fontType,
  onFontTypeChange,
  fontSize,
  onFontSizeDecrease,
  onFontSizeIncrease,
  sidebarOpen,
  onCloseSidebar,
  autoRefine,
  onAutoRefineChange,
  aiMode,
  onAiModeChange,
}: StorySidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col gap-6 h-full">
      {/* Mobile header with close button */}
      <div className="flex items-center justify-between md:hidden">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tùy chỉnh</span>
        <button onClick={onCloseSidebar} className="p-1 text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div id="sidebar-source" className="space-y-4">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nguồn truyện</label>
        <div className="relative">
          <input
            id="url-input-sidebar"
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10 text-slate-300"
            placeholder="Dán URL mới..."
          />
          <div id="quick-fetch-btn" className="absolute right-3 top-2.5 text-indigo-400 cursor-pointer" onClick={onFetch}>
            <ExternalLink size={18} />
          </div>
        </div>
        <button
          id="refresh-content-btn"
          onClick={onFetch}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{loading ? "Đang tải..." : "Làm mới nội dung"}</span>
          <Loader2 className={cn("inline-block", loading ? "animate-spin" : "hidden")} size={16} />
        </button>
      </div>

        <div id="sidebar-ai-config" className="space-y-4">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cấu hình AI</label>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm">Chế độ biên tập</span>
          </div>
          <div className="flex rounded-lg bg-slate-700 p-0.5">
            <button
              onClick={() => onAiModeChange?.("smooth")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                aiMode === "smooth"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mượt mà
            </button>
            <button
              onClick={() => onAiModeChange?.("summarize")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                aiMode === "summarize"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Tóm tắt
            </button>
          </div>
        </div>

        <div id="ai-actions" className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              id="toggle-ai-btn"
              onClick={onToggleAI}
              disabled={isRefining}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2",
                showRefined ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700",
              )}
            >
              <Sparkles size={14} />{" "}
              {isRefining ? "Đang tinh luyện..." : refinedContent ? (showRefined ? "Xem bản gốc" : "Xem bản AI") : "Biên tập AI"}
            </button>
            {/* Auto-refine toggle switch */}
            <button
              id="auto-refine-toggle"
              onClick={() => onAutoRefineChange?.(!autoRefine)}
              className={cn(
                "shrink-0 w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5",
                autoRefine ? "bg-indigo-600" : "bg-slate-700",
              )}
              title={autoRefine ? "Tắt tự động biên tập" : "Bật tự động biên tập"}
            >
              <motion.div
                layout
                className="w-5 h-5 bg-white rounded-full shadow-md"
                animate={{ x: autoRefine ? 16 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          {autoRefine && (
            <p className="text-[10px] text-indigo-400 text-center">Tự động biên tập khi tải chương mới</p>
          )}

          <div id="appearance-controls" className="space-y-4 pt-2">
            <div id="theme-controls" className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  id="theme-light"
                  onClick={() => onThemeChange("light")}
                  className={cn("p-1 rounded cursor-pointer transition-colors", theme === "light" && "bg-slate-600")}
                >
                  <Sun size={14} />
                </button>
                <button
                  id="theme-sepia"
                  onClick={() => onThemeChange("sepia")}
                  className={cn("p-1 rounded cursor-pointer transition-colors", theme === "sepia" && "bg-slate-600")}
                >
                  <Coffee size={14} />
                </button>
                <button
                  id="theme-dark"
                  onClick={() => onThemeChange("dark")}
                  className={cn("p-1 rounded cursor-pointer transition-colors", theme === "dark" && "bg-slate-600")}
                >
                  <Moon size={14} />
                </button>
              </div>
              <span className="text-xs opacity-60 ml-2">Màu nền</span>
            </div>

            <div id="font-controls" className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  id="font-serif"
                  onClick={() => onFontTypeChange("serif")}
                  className={cn("px-2 py-1 text-xs rounded cursor-pointer transition-colors", fontType === "serif" && "bg-slate-600")}
                >
                  Serif
                </button>
                <button
                  id="font-sans"
                  onClick={() => onFontTypeChange("sans")}
                  className={cn("px-2 py-1 text-xs rounded cursor-pointer transition-colors", fontType === "sans" && "bg-slate-600")}
                >
                  Sans
                </button>
              </div>
              <span className="text-xs opacity-60 ml-2">Phông chữ</span>
            </div>

            <div id="font-size-controls" className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex bg-slate-800 rounded-lg p-1 items-center">
                <button
                  id="font-decrease"
                  onClick={onFontSizeDecrease}
                  className="px-2 py-0.5 text-xs font-bold rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer select-none"
                  title="Nhỏ lại (A-)"
                >
                  A-
                </button>
                <span className="text-xs text-slate-300 font-mono font-semibold px-2 select-none min-w-[28px] text-center">{fontSize}px</span>
                <button
                  id="font-increase"
                  onClick={onFontSizeIncrease}
                  className="px-2 py-0.5 text-xs font-bold rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer select-none"
                  title="To hơn (A+)"
                >
                  A+
                </button>
              </div>
              <span className="text-xs opacity-60 ml-2">Cỡ chữ</span>
            </div>
          </div>
        </div>
      </div>

      <div id="footer-note" className="mt-auto p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl">
        <p className="text-[11px] text-indigo-300 leading-relaxed font-mono">
          Hệ thống đang sử dụng mô hình <strong>Gemini 3 Flash</strong>. Tinh lọc ngôn ngữ tự nhiên.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        id="story-sidebar-desktop"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        className="hidden md:flex w-72 lg:w-80 border-r border-slate-800 bg-[#111827] p-6 shrink-0 overflow-y-auto"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={onCloseSidebar}
            />
            <motion.aside
              id="story-sidebar-mobile"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="md:hidden fixed left-0 top-14 bottom-0 z-50 w-80 bg-[#111827] border-r border-slate-800 p-5 overflow-y-auto shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}