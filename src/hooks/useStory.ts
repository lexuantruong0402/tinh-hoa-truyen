import { useState, useRef, useCallback, useEffect } from "react";
import { Story, ParsedReadingInfo } from "@/src/types";
import { refineStoryContent } from "@/src/services/ai";

interface ParseReadingInfoResult {
  storyName: string;
  chapterName: string;
  sourceHost: string;
}

export function useStory() {
  const [url, setUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [refinedContent, setRefinedContent] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showRefined, setShowRefined] = useState(false);
  const [autoRefine, setAutoRefine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  const parseReadingInfo = useCallback((urlStr: string, titleStr: string): ParseReadingInfoResult => {
    let storyName = "";
    let chapterName = titleStr || "Chương hiện tại";
    let sourceHost = "";

    try {
      const parsedUrl = new URL(urlStr);
      sourceHost = parsedUrl.hostname.replace("www.", "");
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        const isChapterSegment = /chuong|c\d+|chapter|\d+/.test(lastSegment.toLowerCase());
        let storySlug = "";
        if (isChapterSegment && pathSegments.length >= 2) {
          storySlug = pathSegments[pathSegments.length - 2];
        } else {
          storySlug = lastSegment;
        }
        storySlug = storySlug.replace(/\.[a-zA-Z0-9]+$/i, "");
        storyName = storySlug
          .split(/[_\-]+/)
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    } catch {
      storyName = "Truyện tự nhập";
      sourceHost = "Trực tiếp";
    }

    if (titleStr) {
      const title = titleStr.trim();
      if (title.includes(" - ") || title.includes(" – ") || title.includes(" — ")) {
        const separator = title.includes(" - ") ? " - " : title.includes(" – ") ? " – " : " — ";
        const parts = title.split(separator);
        const first = parts[0].trim();
        const second = parts.slice(1).join(separator).trim();
        const isFirstChapter = /^(chương|chuong|c\d+|chapter)\b/i.test(first) || /^(c|chap)\s*\d+/i.test(first);
        const isSecondChapter = /^(chương|chuong|c\d+|chapter)\b/i.test(second) || /^(c|chap)\s*\d+/i.test(second);
        if (isFirstChapter && !isSecondChapter) {
          chapterName = first;
          storyName = second;
        } else if (isSecondChapter && !isFirstChapter) {
          storyName = first;
          chapterName = second;
        } else {
          storyName = first;
          chapterName = second;
        }
      } else if (title.includes(":")) {
        const parts = title.split(":");
        const first = parts[0].trim();
        const second = parts.slice(1).join(":").trim();
        const isFirstChapter = /^(chương|chuong|c\d+|chapter)\b/i.test(first) || /^(c|chap)\s*\d+/i.test(first);
        if (isFirstChapter) {
          chapterName = title;
          if (!storyName || storyName === "Truyện chưa rõ tên" || storyName === "Truyện tự nhập") {
            storyName = second;
          }
        } else {
          storyName = first;
          chapterName = second;
        }
      } else {
        const isChapterOnly = /^(chương|chuong|c\d+|chapter)\b/i.test(title) || /^(c|chap)\s*\d+/i.test(title);
        if (isChapterOnly) {
          chapterName = title;
        } else {
          storyName = title;
        }
      }
    }

    if (!storyName || storyName.trim() === "") storyName = "Truyện chưa rõ tên";
    if (!chapterName || chapterName.trim() === "") chapterName = "Chương hiện tại";

    return { storyName, chapterName, sourceHost };
  }, []);

  const fetchStory = useCallback(async (targetUrl: string) => {
    if (!targetUrl) return;
    setUrl(targetUrl);
    setLoading(true);
    setStory(null);
    setRefinedContent("");
    setShowRefined(false);
    setError(null);

    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStory(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định khi tải truyện.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSubmit = useCallback(() => {
    if (!manualContent.trim()) {
      setError("Vui lòng dán nội dung truyện.");
      return;
    }
    const finalTitle = manualTitle.trim() || "Chương không tên";
    setStory({
      title: finalTitle,
      content: manualContent,
      rawUrl: "manual-input",
    });
    setRefinedContent("");
    setShowRefined(false);
    setError(null);
  }, [manualContent, manualTitle]);

  const refineWithAI = useCallback(async () => {
    if (!story) return;
    setIsRefining(true);
    setShowRefined(true);
    setRefinedContent("");
    setError(null);

    try {
      await refineStoryContent(story.content, (text) => {
        setRefinedContent(text);
      });
    } catch (err) {
      console.error("AI Error:", err);
      alert("Lỗi khi xử lý AI. Vui lòng thử lại.");
    } finally {
      setIsRefining(false);
    }
  }, [story]);

  // Auto-refine when story changes and autoRefine is enabled
  useEffect(() => {
    if (autoRefine && story && !isRefining && !refinedContent) {
      refineWithAI();
    }
  }, [story, autoRefine]);

  const copyToClipboard = useCallback(() => {
    const text = showRefined ? refinedContent : story?.content;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [showRefined, refinedContent, story]);

  const currentStoryInfo = story ? parseReadingInfo(story.rawUrl || url, story.title) : null;

  return {
    url,
    setUrl,
    manualTitle,
    setManualTitle,
    manualContent,
    setManualContent,
    isManualInput,
    setIsManualInput,
    loading,
    story,
    setStory,
    refinedContent,
    isRefining,
    showRefined,
    setShowRefined,
    autoRefine,
    setAutoRefine,
    error,
    setError,
    copied,
    fetchStory,
    handleManualSubmit,
    refineWithAI,
    copyToClipboard,
    currentStoryInfo,
    parseReadingInfo,
    readerScrollRef,
  };
}