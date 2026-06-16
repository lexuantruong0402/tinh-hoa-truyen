import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { BookOpen, Loader2, Trash2 } from "lucide-react";

interface LandingHeroProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
  loading: boolean;
  isManualInput: boolean;
  onToggleInputMode: (manual: boolean) => void;
  manualTitle: string;
  onManualTitleChange: (title: string) => void;
  manualContent: string;
  onManualContentChange: (content: string) => void;
  onManualSubmit: () => void;
  error: string | null;
}

export default function LandingHero({
  url,
  onUrlChange,
  onFetch,
  loading,
  isManualInput,
  onToggleInputMode,
  manualTitle,
  onManualTitleChange,
  manualContent,
  onManualContentChange,
  onManualSubmit,
  error,
}: LandingHeroProps) {
  return (
    <motion.div
      id="landing-hero"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center text-center text-slate-900 px-4 md:px-8"
    >
      <div
        id="hero-icon"
        className="w-14 h-14 md:w-16 md:h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-xl shadow-indigo-500/40"
      >
        <BookOpen size={28} className="md:size-[32px]" />
      </div>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-serif font-bold mb-3 md:mb-4 px-2">Tinh lọc nội dung, nâng tầm trải nghiệm</h2>
      <p className="text-slate-500 mb-6 md:mb-8 max-w-sm text-sm md:text-base px-2">Chuyển đổi truyện convert sang tiếng Việt mượt mà với AI.</p>

      <div
        id="search-box-container"
        className="w-full max-w-xl bg-white p-4 md:p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 md:mb-6">
          <button
            onClick={() => onToggleInputMode(false)}
            className={cn(
              "flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all",
              !isManualInput ? "bg-white shadow-sm text-indigo-600" : "text-slate-500",
            )}
          >
            Dùng URL
          </button>
          <button
            onClick={() => onToggleInputMode(true)}
            className={cn(
              "flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all",
              isManualInput ? "bg-white shadow-sm text-indigo-600" : "text-slate-500",
            )}
          >
            Dán trực tiếp
          </button>
        </div>

        {!isManualInput ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="url-input-main"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://truyen.com/..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              onKeyDown={(e) => e.key === "Enter" && onFetch()}
            />
            <button
              id="main-fetch-btn"
              onClick={onFetch}
              disabled={loading}
              className="bg-indigo-600 text-white rounded-xl px-5 md:px-6 py-3 font-medium hover:bg-indigo-500 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Tìm kiếm"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => onManualTitleChange(e.target.value)}
              placeholder="Tiêu đề chương (không bắt buộc)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            <textarea
              value={manualContent}
              onChange={(e) => onManualContentChange(e.target.value)}
              placeholder="Dán nội dung truyện convert tại đây..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px] md:min-h-[200px] text-slate-800"
            />
            <button
              onClick={onManualSubmit}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 md:py-4 font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 text-sm"
            >
              Bắt đầu biên tập
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <Trash2 size={14} /> {error}
          </div>
        )}
      </div>
    </motion.div>
  );
}