/**
 * AI service - calls the backend /api/refine endpoint (server-side Gemini, API key safe).
 * No direct Gemini API call happens in the browser.
 */

export async function refineStoryContent(
  storyContent: string,
  onChunk: (text: string) => void,
  mode: "smooth" | "summarize" = "smooth"
): Promise<string> {
  
  const response = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: storyContent, mode }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  // Throttle onChunk with requestAnimationFrame to avoid excessive React re-renders
  let scheduled = false;
  let latestText = "";

  const scheduleUpdate = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        onChunk(latestText);
      });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.error) throw new Error(data.error);
        if (data.done) {
          // Flush any pending update before returning
          if (scheduled) {
            cancelAnimationFrame(requestAnimationFrame(() => {}));
            onChunk(fullText);
          }
          onChunk(fullText);
          return fullText;
        }
        if (data.text) {
          fullText += data.text;
          latestText = fullText;
          scheduleUpdate();
        }
      } catch (e: any) {
        // If parsing failed and it's not our error, rethrow
        if (e.message && e.message !== "Unexpected end of JSON input") {
          throw e;
        }
      }
    }
  }

  // Flush final text
  if (latestText !== fullText) {
    onChunk(fullText);
  }

  return fullText;
}