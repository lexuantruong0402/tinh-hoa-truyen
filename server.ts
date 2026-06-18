import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { scrapeChapter } from "./src/services/scraper.js";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

// Reuse Gemini client across all requests (avoid re-initialization overhead)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "8080", 10);

  app.use(express.json({ limit: "10mb" }));

  // API to refine story content with Gemini AI (server-side, API key safe)
  app.post("/api/refine", async (req, res) => {
    const { content, mode } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }

    const isSummarize = mode === "summarize";

    const summarizePrompt = `
      Tóm tắt chương truyện sau đây thành một bản ngắn gọn hơn, chỉ khoảng 30-40% độ dài gốc, nhưng vẫn giữ nguyên ý chính và diễn biến của câu chuyện.
      Mục đích là để người đọc có thể nắm bắt được nội dung chính của chương mà không cần đọc toàn bộ chi tiết. 
      Hãy tập trung vào việc tóm tắt các bối cảnh, sự kiện quan trọng, tình tiết then chốt, và diễn biến tâm lý của nhân vật.
      Đưa ra 5-9 ý chính của chương
      Nội dung chương cần tóm tắt:
      ${content}

      Yêu cầu BẮT BUỘC:
      - Chỉ trả về nội dung tóm tắt.
      - KHÔNG chào hỏi, không giải thích, không thêm phần giới thiệu hay ghi chú.
      - Sử dụng dấu gạch đầu dòng để liệt kê các ý chính trong phần tóm tắt.
    `;

    const smoothPrompt = `
      Bạn là một biên tập viên văn học mạng chuyên nghiệp, tinh thông hán việt và văn phong tiên hiệp, kiếm hiệp.
      Dưới đây là một chương truyện đã được dịch thô (convert) từ tiếng Trung sang tiếng Việt. 
      Nhiệm vụ của bạn là biên tập lại toàn bộ nội dung này sang tiếng Việt mượt mà, tự nhiên, thoát ý và thuần Việt hơn, nhưng vẫn giữ được "phong vị" của truyện mạng.
      
      Yêu cầu BẮT BUỘC:
      1. Giữ nguyên ý nghĩa gốc và logic của câu chuyện.
      2. TUYÊT ĐỐI KHÔNG tóm tắt. Dịch đầy đủ từng chi tiết, không bỏ sót từ nào.
      3. Sử dụng từ hán việt phù hợp cho bối cảnh cổ đại/tiên hiệp. Văn phong phải trang trọng hoặc hào sảng tùy tình tiết.
      4. Sửa triệt để các lỗi ngữ pháp "convert" (ví dụ: dùng sai từ nối, cấu trúc câu bị ngược, lặp từ vô nghĩa).
      5. Giữ nguyên định dạng đoạn văn ban đầu.
      6. ĐẠI TỪ NHÂN XƯNG (CỰC KỲ QUAN TRỌNG): 
         - Bạn PHẢI GIỮ NGUYÊN các đại từ nhân xưng xưng hô kiểu Hán Việt như: ta, ngươi, hắn, nàng, lão già, tiểu tử, vị này, huynh đệ, sư phụ, đồ nhi, lão tổ, bản tôn, thiếp thân, chư vị, v.v.
         - Tuyệt đối KHÔNG được hiện đại hóa chúng thành: tôi, bạn, anh, em, cô ấy, cậu ấy, nó. 
         - Việc thay đổi các đại từ này sẽ làm hỏng bối cảnh truyện. Hãy để chúng tự nhiên trong câu văn Việt.

      Nội dung chương cần biên tập:
      ${content}

      LƯU Ý:
      - Chỉ trả về nội dung đã biên tập.
      - KHÔNG chào hỏi, không giải thích, không tóm tắt, không thêm phần giới thiệu hay ghi chú.
      - Giữ nguyên cấu trúc đoạn văn và phân đoạn ban đầu.
    `;

    const prompt = isSummarize ? summarizePrompt : smoothPrompt;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const response = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });

      // Batch chunks to reduce SSE event frequency
      let batchBuffer = "";
      let batchTimer: NodeJS.Timeout | null = null;
      const FLUSH_INTERVAL = 60; // ms - flush every 60ms

      const flushBatch = () => {
        if (batchBuffer) {
          res.write(`data: ${JSON.stringify({ text: batchBuffer })}\n\n`);
          batchBuffer = "";
        }
      };

      for await (const chunk of response) {
        const delta = chunk.text || "";
        if (delta) {
          batchBuffer += delta;
          if (!batchTimer) {
            batchTimer = setTimeout(() => {
              batchTimer = null;
              flushBatch();
            }, FLUSH_INTERVAL);
          }
        }
      }

      // Flush any remaining buffered text
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      flushBatch();

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      console.error("Gemini AI Error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message || "AI processing failed" })}\n\n`);
    } finally {
      res.end();
    }
  });

  // API to detect chapter info using Gemini (story name, chapter number, chapter name)
  app.post("/api/detect-chapter", async (req, res) => {
    const { content, title, url } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }

    // Use first 2000 chars for analysis (enough to determine story/chapter context)
    const sampleContent = content.substring(0, 2000);

    const prompt = `
      Bạn là chuyên gia phân tích truyện Trung Quốc đã dịch sang tiếng Việt.
      
      Nhiệm vụ: Từ nội dung chương truyện dưới đây, hãy xác định:
      1. Tên truyện (storyName): Tên bộ truyện.
      2. Chương số (chapterNumber): Số chương (nếu có, ví dụ 1, 2, 100...).
      3. Tên chương (chapterName): Tiêu đề của chương này.

      Quy tắc:
      - Nếu tên truyện có thể suy ra từ nội dung hoặc title được cung cấp, hãy dùng nó.
      - Nếu không rõ tên truyện, trả về "Không rõ".
      - Chương số: chỉ trả về số, không có chữ "Chương". Ví dụ: "15", "120". Nếu không có, trả về "".
      - Tên chương: là tên gọi của chương này (ví dụ: "thượng quan vân phi", "đại náo thiên cung"). Nếu không có, trả về "".
      
      Thông tin bổ sung:
      - Title trang: ${title || "Không có"}
      - URL: ${url || "Không có"}

      Trả về KẾT QUẢ dưới dạng JSON (chỉ trả về JSON, không có text khác):
      {
        "storyName": "...",
        "chapterNumber": "...",
        "chapterName": "..."
      }

      Nội dung chương:
      ${sampleContent}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });

      const text = response.text || "";
      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            storyName: parsed.storyName || "",
            chapterNumber: parsed.chapterNumber || "",
            chapterName: parsed.chapterName || "",
          });
        } catch {
          return res.json({ storyName: "", chapterNumber: "", chapterName: "" });
        }
      }
      return res.json({ storyName: "", chapterNumber: "", chapterName: "" });
    } catch (err: any) {
      console.error("Gemini Detect Error:", err);
      return res.json({ storyName: "", chapterNumber: "", chapterName: "" });
    }
  });

  // API to scrape story content
  app.get("/api/scrape", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const result = await scrapeChapter(url);
      res.json(result);
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      res.status(500).json({ error: "Lỗi: Trang web này chặn truy cập hoặc URL không hợp lệ." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();