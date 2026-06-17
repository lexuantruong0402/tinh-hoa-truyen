import { useMemo } from "react";
import { cn } from "@/src/lib/utils";
import { BookOpen, Bookmark, Check } from "lucide-react";
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
              {showRefined ? "Bản mượt mà" : "Bản dịch thô"}
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
          <div id="ai-loading-indicator" className="animate-pulse space-y-4">
            <div className="h-4 bg-indigo-200/20 rounded w-full"></div>
            <div className="h-4 bg-indigo-200/20 rounded w-5/6"></div>
          </div>
        )}
      </article>

      <footer
        id="story-footer"
        className={cn(
          "mt-8 md:mt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 md:py-6 border-t font-medium text-xs md:text-sm",
          theme === "sepia"
            ? "border-amber-200 text-slate-500"
            : theme === "dark"
              ? "border-slate-800 text-slate-500"
              : "border-slate-200 text-slate-400",
        )}
      >
        <div id="chap-nav" className="flex gap-4 w-full md:w-auto justify-between md:justify-start">
          {story.prevUrl ? (
            <button
              id="prev-chap-btn"
              onClick={() => onFetchChapter(story.prevUrl!)}
              disabled={loading}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer font-bold duration-200"
            >
              ← Chương trước
            </button>
          ) : (
            <button
              id="prev-chap-btn"
              disabled
              className="text-slate-400/40 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 font-bold"
            >
              ← Chương trước
            </button>
          )}

          {story.nextUrl ? (
            <button
              id="next-chap-btn"
              onClick={() => onFetchChapter(story.nextUrl!)}
              disabled={loading}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer font-bold duration-200"
            >
              Chương sau →
            </button>
          ) : (
            <button
              id="next-chap-btn"
              disabled
              className="text-slate-400/40 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 font-bold"
            >
              Chương sau →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}