/**
 * Client service to call the /api/detect-chapter endpoint (server-side Gemini).
 */

export interface DetectedChapterInfo {
  storyName: string;
  chapterNumber: string;
  chapterName: string;
}

export async function detectChapterInfo(
  content: string,
  title?: string,
  url?: string,
): Promise<DetectedChapterInfo> {
  const response = await fetch("/api/detect-chapter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title, url }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return {
    storyName: data.storyName || "",
    chapterNumber: data.chapterNumber || "",
    chapterName: data.chapterName || "",
  };
}