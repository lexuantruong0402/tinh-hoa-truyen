import { useMemo } from "react";
import { cn } from "@/src/lib/utils";
import { BookOpen, Bookmark, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Theme, FontType, Story, ParsedReadingInfo } from "@/src/types";

interface StoryReaderProps {
  story: Story;
  theme: Theme;
  fontType: FontType;
  fontSize: number;
  themes: Record<Theme, string>;
  showRefined: boolean;
  refinedContent: string;
  isRefining: boolean;
  copied: boolean;
  currentStoryInfo: ParsedReadingInfo | null;
  loading: boolean;
  onCopy: () => void;
  onFetchChapter: (url: string) => void;
  aiMode?: "smooth" | "summarize";
}

/** Memoized paragraph list - only recomputes when content changes */
function Paragraphs({ content, theme }: { content: string; theme: Theme }) {
  const lines = useMemo(() => {
    return content
      .split("\n")
      .filter(Boolean)
      .map((line, i) => (
        <p key={i} className="mb-6">
          {line.startsWith(" ") ? line : line}
        </p>
      ));
  }, [content]);

  return <>{lines}</>;
}

function ChapterNav({
  prevUrl,
  nextUrl,
  loading,
  onFetchChapter,
  theme,
}: {
  prevUrl?: string | null;
  nextUrl?: string | null;
  loading: boolean;
  onFetchChapter: (url: string) => void;
  theme: Theme;
}) {
  return (
    <div className="flex gap-4 w-full justify-between items-center">
      {prevUrl ? (
        <button
          onClick={() => onFetchChapter(prevUrl!)}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200",
            theme === "dark"
              ? "text-slate-300 hover:bg-slate-800 hover:text-indigo-400"
              : theme === "sepia"
                ? "text-slate-600 hover:bg-amber-100 hover:text-indigo-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600",
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <ArrowLeft size={16} />
          <span>Chương trước</span>
        </button>
      ) : (
        <button
          disabled
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm",
            theme === "dark"
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-300 cursor-not-allowed",
          )}
        >
          <ArrowLeft size={16} />
          <span>Chương trước</span>
        </button>
      )}

      {nextUrl ? (
        <button
          onClick={() => onFetchChapter(nextUrl!)}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200",
            theme === "dark"
              ? "text-slate-300 hover:bg-slate-800 hover:text-indigo-400"
              : theme === "sepia"
                ? "text-slate-600 hover:bg-amber-100 hover:text-indigo-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600",
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <span>Chương sau</span>
          <ArrowRight size={16} />
        </button>
      ) : (
        <button
          disabled
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm",
            theme === "dark"
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-300 cursor-not-allowed",
          )}
        >
          <span>Chương sau</span>
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

export default function StoryReader({
  story,
  theme,
  fontType,
  fontSize,
  themes,
  showRefined,
  refinedContent,
  isRefining,
  copied,
  currentStoryInfo,
  loading,
  onCopy,
  onFetchChapter,
  aiMode,
}: StoryReaderProps) {
  const displayContent = showRefined ? refinedContent : story.content;

  return (
      <div
        id="story-reader"
        className={cn("transition-all duration-300 flex-1 flex flex-col", themes[theme], "p-4 md:p-8 lg:p-0 bg-transparent border-0")}
      >
        <header
          id="story-header"
          className={cn(
            "mb-4 md:mb-8 border-b pb-4 md:pb-6",
            theme === "sepia" ? "border-amber-200" : theme === "dark" ? "border-slate-800" : "border-slate-200",
          )}
        >
          {currentStoryInfo && (
            <div className="mb-2 text-xs md:text-sm font-bold tracking-widest uppercase text-indigo-500 font-sans">
              {currentStoryInfo.storyName}
            </div>
          )}
          <h1
            id="story-title"
            className={cn(
              "text-xl md:text-2xl lg:text-3xl font-serif font-bold mb-2 leading-tight transition-colors",
              theme === "dark" ? "text-slate-200" : "text-slate-900",
            )}
          >
            {currentStoryInfo ? currentStoryInfo.chapterName : story.title}
          </h1>
          <div id="story-meta" className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-slate-500 font-medium items-center">
            <span className="flex items-center gap-1">
              <BookOpen size={14} /> AI Biên tập
            </span>
            <span className="flex items-center gap-1 opacity-60">
              {showRefined
                ? (aiMode === "summarize" ? "Bản tóm tắt" : "Bản mượt mà")
                : "Bản dịch thô"}
            </span>
            <div className="flex gap-2 md:gap-4 ml-auto items-center">
              <button
                onClick={onCopy}
                className={cn(
                  "text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all px-2 md:px-3 py-1 md:py-1.5 rounded-lg",
                  copied ? "bg-green-100 text-green-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600",
                )}
              >
                {copied ? <Check size={14} /> : <Bookmark size={14} />}
                {copied ? "Đã chép" : "Sao chép"}
              </button>
            </div>
          </div>
        </header>

      <div className={cn("mb-6 md:mb-8", theme === "sepia" ? "border-amber-200" : theme === "dark" ? "border-slate-800" : "border-slate-200")}>
        <ChapterNav
          prevUrl={story.prevUrl}
          nextUrl={story.nextUrl}
          loading={loading}
          onFetchChapter={onFetchChapter}
          theme={theme}
        />
      </div>

      <article
        id="story-article"
        className={cn(
          "leading-relaxed space-y-4 md:space-y-6 flex-1 transition-all duration-300 px-0 md:px-4",
          fontType === "serif" ? "font-serif" : "font-sans",
          theme === "dark" ? "text-slate-400" : "text-slate-700",
        )}
        style={{ fontSize: `${Math.max(14, Math.min(fontSize, 24))}px` }}
      >
        <Paragraphs content={displayContent} theme={theme} />

        {isRefining && showRefined && (
          <div
            id="ai-loading-indicator"
            className="flex flex-col items-center justify-center py-8 space-y-3 border-2 border-dashed border-indigo-300/30 rounded-xl bg-indigo-500/5"
          >
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-bold text-indigo-500 text-sm">
                AI đang biên tập
                <span className="animate-bounce inline-block" style={{ animationDelay: "0s" }}>.</span>
                <span className="animate-bounce inline-block" style={{ animationDelay: "0.2s" }}>.</span>
                <span className="animate-bounce inline-block" style={{ animationDelay: "0.4s" }}>.</span>
              </span>
            </div>
            <p className="text-xs text-indigo-400/70">Nội dung bên dưới sẽ được cập nhật dần...</p>
          </div>
        )}
      </article>

      <footer
        id="story-footer"
        className={cn(
          "mt-8 md:mt-12 pt-4 md:pt-6 border-t",
          theme === "sepia"
            ? "border-amber-200"
            : theme === "dark"
              ? "border-slate-800"
              : "border-slate-200",
        )}
      >
        <ChapterNav
          prevUrl={story.prevUrl}
          nextUrl={story.nextUrl}
          loading={loading}
          onFetchChapter={onFetchChapter}
          theme={theme}
        />
      </footer>
    </div>
  );
}