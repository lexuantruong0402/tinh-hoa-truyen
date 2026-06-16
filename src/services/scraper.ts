import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  title: string;
  content: string;
  rawUrl: string;
  nextUrl: string | null;
  prevUrl: string | null;
}

function resolveUrl(href: string | undefined, currentUrl: string): string | null {
  if (!href) return null;
  try {
    if (href.startsWith("http://") || href.startsWith("https://")) return href;
    const currentUrlObj = new URL(currentUrl);
    const baseUrl = currentUrlObj.protocol + "//" + currentUrlObj.host;
    if (href.startsWith("//")) return currentUrlObj.protocol + href;
    if (href.startsWith("/")) return baseUrl + href;
    const pathParts = currentUrlObj.pathname.split("/");
    pathParts.pop();
    return baseUrl + pathParts.join("/") + "/" + href;
  } catch {
    return null;
  }
}

function extractNavigationLinks($: cheerio.CheerioAPI, url: string): { nextUrl: string | null; prevUrl: string | null } {
  let nextUrl: string | null = null;
  let prevUrl: string | null = null;

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const text = $(element).text().toLowerCase().trim();
    const id = ($(element).attr("id") || "").toLowerCase();
    const className = ($(element).attr("class") || "").toLowerCase();
    const titleAttr = ($(element).attr("title") || "").toLowerCase();
    const resolved = resolveUrl(href, url);
    if (!resolved || resolved === url || resolved.includes("javascript:") || resolved === "#") return;

    const isNextText =
      text.includes("chương sau") ||
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

    const isNextAttr =
      id.includes("next") ||
      className.includes("next") ||
      titleAttr.includes("next") ||
      id.includes("btn-next") ||
      className.includes("btn-next") ||
      id.includes("chuong-sau") ||
      className.includes("chuong-sau");

    const isPrevText =
      text.includes("chương trước") ||
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

    const isPrevAttr =
      id.includes("prev") ||
      className.includes("prev") ||
      titleAttr.includes("prev") ||
      id.includes("btn-prev") ||
      className.includes("btn-prev") ||
      id.includes("chuong-truoc") ||
      className.includes("chuong-truoc");

    if (isNextText || (isNextAttr && (text.includes("chương") || text.includes("sau") || text === "" || text === ">"))) {
      if (!nextUrl || isNextText) nextUrl = resolved;
    }
    if (isPrevText || (isPrevAttr && (text.includes("chương") || text.includes("trước") || text === "" || text === "<"))) {
      if (!prevUrl || isPrevText) prevUrl = resolved;
    }
  });

  // Numeric fallback for chapter URLs
  const queryMatch = url.match(/([\?&](?:chap|chapter|chuong|c)=)(\d+)/i);
  if (queryMatch) {
    const prefix = queryMatch[1];
    const num = parseInt(queryMatch[2], 10);
    if (!nextUrl) nextUrl = url.replace(queryMatch[0], prefix + (num + 1));
    if (!prevUrl && num > 1) prevUrl = url.replace(queryMatch[0], prefix + (num - 1));
  }

  const lastPartMatch = url.match(/([^\d]*)(\d+)(\.[a-zA-Z0-9]+|\/)?$/);
  if (lastPartMatch) {
    const prefix = lastPartMatch[1];
    const numStr = lastPartMatch[2];
    const suffix = lastPartMatch[3] || "";
    const num = parseInt(numStr, 10);
    if (!nextUrl) nextUrl = prefix + (num + 1) + suffix;
    if (!prevUrl && num > 1) prevUrl = prefix + (num - 1) + suffix;
  }

  return { nextUrl, prevUrl };
}

export async function scrapeChapter(url: string): Promise<ScrapeResult> {
  console.log(`Scraping: ${url}`);

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://www.google.com/",
      DNT: "1",
      "Upgrade-Insecure-Requests": "1",
    },
    timeout: 10000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

  const title = $("h1, h2, .title, .chapter-title, .title-chuong").first().text().trim();

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
    ".post-content",
  ];

  let contentHtml = "";
  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      el.find("script, style, iframe, ads, .ads, .advertisement, noscript, .adsbygoogle, .fb-quote").remove();
      contentHtml = el.html() || "";
      if ($(el).text().length > 300) break;
    }
  }

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

  const cleanContent = contentHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleanContent.length < 100) {
    throw new Error("Không tìm thấy nội dung truyện ở trang này.");
  }

  const { nextUrl, prevUrl } = extractNavigationLinks($, url);

  return {
    title: title || "Chương truyện không tên",
    content: cleanContent,
    rawUrl: url,
    nextUrl,
    prevUrl,
  };
}