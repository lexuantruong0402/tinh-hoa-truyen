import { useState, useCallback, useEffect } from "react";
import { ReadingHistory } from "@/src/types";
import { fetchReadingHistory, saveReadingHistoryRecord, deleteReadingHistoryItem } from "@/src/services/firestore";
import { DetectedChapterInfo } from "@/src/services/detectChapter";

export function useReadingHistory(userId: string | null, parseReadingInfoFn: (url: string, title: string) => any) {
  const [readingHistoryList, setReadingHistoryList] = useState<ReadingHistory[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "history">("home");

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setReadingHistoryList([]);
      return;
    }
    const items = await fetchReadingHistory(userId);
    setReadingHistoryList(items);
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveHistory = useCallback(
    async (storyTitle: string, currentUrl: string, detectedInfo?: DetectedChapterInfo | null) => {
      if (!userId) return;
      await saveReadingHistoryRecord(storyTitle, currentUrl, userId, parseReadingInfoFn, detectedInfo);
      loadHistory();
    },
    [userId, parseReadingInfoFn, loadHistory],
  );

  const deleteItem = useCallback(async (id: string) => {
    await deleteReadingHistoryItem(id);
    setReadingHistoryList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    readingHistoryList,
    confirmDeleteId,
    setConfirmDeleteId,
    view,
    setView,
    loadHistory,
    saveReadingHistory: saveHistory,
    deleteItem,
  };
}