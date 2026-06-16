import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to scrape story content
  app.get("/api/scrape", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Scraping: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Referer": "https://www.google.com/",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Heuristic to find title
      let title = $("h1, h2, .title, .chapter-title, .title-chuong").first().text().trim();
      
      // Heuristic to find content
      const contentSelectors = [
        ".chapter-content",
        "#chapter-content",
        ".box-content",
        "#chapter-c",
        ".chapter-c",
        ".chuong-content",
        "#chuong-content",
        ".chapter-body",
        "#content",
        ".content",
        ".ct-chapter",
        ".reading-content",
        "#js-reading-content",
        "article",
        ".txt",
        ".read-content",
        ".entry-content",
        ".post-content"
      ];

      let contentHtml = "";
      for (const selector of contentSelectors) {
        const el = $(selector);
        if (el.length > 0) {
          // Remove ads, scripts, etc.
          el.find("script, style, iframe, ads, .ads, .advertisement, noscript, .adsbygoogle, .fb-quote").remove();
          contentHtml = el.html() || "";
          // If we found a good chunk of text, we're likely correct
          if ($(el).text().length > 300) break;
        }
      }

      // Fallback: search for the div with the most <p> tags or most text
      if (!contentHtml || contentHtml.length < 300) {
        let maxText = 0;
        $("div").each((_, el) => {
          const text = $(el).text();
          if (text.length > maxText) {
            maxText = text.length;
            contentHtml = $(el).html() || "";
          }
        });
      }

      // Cleanup HTML and convert to clean text
      const cleanContent = contentHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<div[^>]*>/gi, "")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]*>?/gm, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
        .trim();

      if (cleanContent.length < 100) {
        return res.status(404).json({ error: "Không tìm thấy nội dung truyện ở trang này." });
      }

      // Extract Next and Prev chapter URLs
      let nextUrl: string | null = null;
      let prevUrl: string | null = null;

      try {
        const currentUrlObj = new URL(url);
        const baseUrl = currentUrlObj.protocol + "//" + currentUrlObj.host;

        const resolveUrl = (href: string | undefined): string | null => {
          if (!href) return null;
          try {
            if (href.startsWith("http://") || href.startsWith("https://")) {
              return href;
            }
            if (href.startsWith("//")) {
              return currentUrlObj.protocol + href;
            }
            if (href.startsWith("/")) {
              return baseUrl + href;
            }
            // Relative path
            const pathParts = currentUrlObj.pathname.split("/");
            pathParts.pop(); // remove last element (e.g. chuong-522)
            return baseUrl + pathParts.join("/") + "/" + href;
          } catch {
            return null;
          }
        };

        $("a").each((_, element) => {
          const href = $(element).attr("href");
          if (!href) return;
          const text = $(element).text().toLowerCase().trim();
          const id = ($(element).attr("id") || "").toLowerCase();
          const className = ($(element).attr("class") || "").toLowerCase();
          const titleAttr = ($(element).attr("title") || "").toLowerCase();

          const resolved = resolveUrl(href);
          if (!resolved || resolved === url || resolved.includes("javascript:") || resolved === "#") return;

          // Check for next chapter indicators
          const isNextText = text.includes("chương sau") || 
                             text.includes("chuong sau") || 
                             text.includes("tiếp theo") || 
                             text.includes("phần sau") ||
                             text === "sau" || 
                             text === "tiếp" || 
                             text === "next" || 
                             text === "next →" ||
                             text === "→" || 
                             text === ">>" || 
                             text.includes("chương tiếp") || 
                             text.includes("chuong tiep");

          const isNextAttr = id.includes("next") || 
                             className.includes("next") || 
                             titleAttr.includes("next") ||
                             id.includes("btn-next") ||
                             className.includes("btn-next") ||
                             id.includes("chuong-sau") ||
                             className.includes("chuong-sau");

          // Check for prev chapter indicators
          const isPrevText = text.includes("chương trước") || 
                             text.includes("chuong truoc") || 
                             text.includes("trở lại") || 
                             text.includes("phần trước") ||
                             text === "trước" || 
                             text === "lùi" || 
                             text === "prev" || 
                             text === "back" || 
                             text === "← prev" ||
                             text === "←" || 
                             text === "<<" || 
                             text.includes("chương cũ") || 
                             text.includes("chuong cu");

          const isPrevAttr = id.includes("prev") || 
                             className.includes("prev") || 
                             titleAttr.includes("prev") ||
                             id.includes("btn-prev") ||
                             className.includes("btn-prev") ||
                             id.includes("chuong-truoc") ||
                             className.includes("chuong-truoc");

          if (isNextText || (isNextAttr && (text.includes("chương") || text.includes("sau") || text === "" || text === ">"))) {
            if (!nextUrl || isNextText) {
              nextUrl = resolved;
            }
          }

          if (isPrevText || (isPrevAttr && (text.includes("chương") || text.includes("trước") || text === "" || text === "<"))) {
            if (!prevUrl || isPrevText) {
              prevUrl = resolved;
            }
          }
        });

        // Numeric Fallback 1: Chapter queries e.g. ?chap=123
        const queryMatch = url.match(/([\?&](?:chap|chapter|chuong|c)=)(\d+)/i);
        if (queryMatch) {
          const prefix = queryMatch[1];
          const num = parseInt(queryMatch[2], 10);
          if (!nextUrl) {
            nextUrl = url.replace(queryMatch[0], prefix + (num + 1));
          }
          if (!prevUrl && num > 1) {
            prevUrl = url.replace(queryMatch[0], prefix + (num - 1));
          }
        }

        // Numeric Fallback 2: Path ends with a number e.g. /chuong-522
        if (!nextUrl || !prevUrl) {
          const lastPartMatch = url.match(/([^\d]*)(\d+)(\.[a-zA-Z0-9]+|\/)?$/);
          if (lastPartMatch) {
            const prefix = lastPartMatch[1];
            const numStr = lastPartMatch[2];
            const suffix = lastPartMatch[3] || "";
            const num = parseInt(numStr, 10);
            
            if (!nextUrl) {
              nextUrl = prefix + (num + 1) + suffix;
            }
            if (!prevUrl && num > 1) {
              prevUrl = prefix + (num - 1) + suffix;
            }
          }
        }
      } catch (err) {
        console.error("Error generating next/prev URLs:", err);
      }

      res.json({
        title: title || "Chương truyện không tên",
        content: cleanContent,
        rawUrl: url,
        nextUrl,
        prevUrl
      });
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
