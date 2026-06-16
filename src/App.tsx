import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  BookOpen, 
  Sparkles, 
  Settings, 
  Sun, 
  Moon, 
  Coffee, 
  Type, 
  AlignLeft, 
  ExternalLink,
  ChevronLeft,
  Loader2,
  Trash2,
  Search,
  LogIn,
  LogOut,
  Bookmark,
  Save,
  History,
  Trash,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { auth, signIn, signOut, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";

// --- Types ---
type Theme = "light" | "dark" | "sepia";
type FontType = "serif" | "sans";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Context: ', JSON.stringify(errInfo));
  return errInfo.error;
}

interface Story {
  title: string;
  content: string;
  rawUrl: string;
  nextUrl?: string | null;
  prevUrl?: string | null;
}

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ReadingHistory {
  id: string;
  storyName: string;
  chapterName: string;
  url: string;
  sourceHost: string;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [readingHistoryList, setReadingHistoryList] = useState<ReadingHistory[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [view, setView] = useState<"home" | "history">("home");
  const [url, setUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [refinedContent, setRefinedContent] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showRefined, setShowRefined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reader Settings
  const [theme, setTheme] = useState<Theme>("sepia");
  const [fontSize, setFontSize] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const readerScrollRef = useRef<HTMLDivElement>(null);
  const bootstrapAttempted = useRef(false);

  useEffect(() => {
    if (story && readerScrollRef.current) {
      readerScrollRef.current.scrollTop = 0;
    }
  }, [story]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyToClipboard = () => {
    const text = showRefined ? refinedContent : story?.content;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchReadingHistory(currentUser.uid);
      } else {
        setReadingHistoryList([]);
        setView("home");
        bootstrapAttempted.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  const parseReadingInfo = (urlStr: string, titleStr: string) => {
    let storyName = "";
    let chapterName = titleStr || "Chương hiện tại";
    let sourceHost = "";

    // 1. Extract info from URL
    try {
      const parsedUrl = new URL(urlStr);
      sourceHost = parsedUrl.hostname.replace("www.", "");
      
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        // If last segment starts with or contains chapter indicator, use the penultimate segment as story slug
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
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    } catch (e) {
      storyName = "Truyện tự nhập";
      sourceHost = "Trực tiếp";
    }

    // 2. Extract and refine from scraped title String (titleStr)
    if (titleStr) {
      const title = titleStr.trim();
      
      // Case 1: Split by "-" (separates Story Name and Chapter/Chapter Title)
      if (title.includes(" - ") || title.includes(" – ") || title.includes(" — ")) {
        const separator = title.includes(" - ") ? " - " : (title.includes(" – ") ? " – " : " — ");
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
      } 
      // Case 2: Title like "Chương 123: Thần Đạo Bí Mật"
      else if (title.includes(":")) {
        const parts = title.split(":");
        const first = parts[0].trim();
        const second = parts.slice(1).join(":").trim();
        
        const isFirstChapter = /^(chương|chuong|c\d+|chapter)\b/i.test(first) || /^(c|chap)\s*\d+/i.test(first);
        if (isFirstChapter) {
          // The entire title is the chapter name
          chapterName = title;
          // But if we already have a clean storyName from URL, preserve it!
          if (!storyName || storyName === "Truyện chưa rõ tên" || storyName === "Truyện tự nhập") {
            storyName = second;
          }
        } else {
          storyName = first;
          chapterName = second;
        }
      }
      // Case 3: Title is chapter-only (e.g. "Chương 123")
      else {
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
  };

  const currentStoryInfo = story ? parseReadingInfo(story.rawUrl || url, story.title) : null;

  async function fetchReadingHistory(userId: string) {
    const path = "reading_history";
    try {
      const q = query(
        collection(db, path),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const historyItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReadingHistory[];
      
      historyItems.sort((a, b) => {
        const timeA = (a.updatedAt || a.createdAt)?.toMillis?.() || 0;
        const timeB = (b.updatedAt || b.createdAt)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      if (historyItems.length === 0 && !bootstrapAttempted.current) {
        bootstrapAttempted.current = true;
        // Automatically bootstrap first history document so that Firestore generates the collection
        const introStoryTitle = "Cẩm nang Tinh Hoa Truyện - Hướng dẫn sử dụng";
        const introUrl = "https://tinhhoatruyen.vn/huong-dan";
        await saveReadingHistory(introStoryTitle, introUrl);
      } else {
        setReadingHistoryList(historyItems);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  async function saveReadingHistory(storyTitle: string, currentUrl: string) {
    if (!auth.currentUser) return;
    if (!storyTitle || !currentUrl) return;

    const userId = auth.currentUser.uid;
    const { storyName, chapterName, sourceHost } = parseReadingInfo(currentUrl, storyTitle);
    
    // Create a sanitized document ID per story to prevent duplicated stories in history
    const storySlug = storyName.toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 100);
    const historyDocId = `${userId}_${storySlug}`;
    const path = `reading_history/${historyDocId}`;

    try {
      const docRef = doc(db, "reading_history", historyDocId);
      const docSnap = await getDoc(docRef).catch(() => null);

      if (docSnap && docSnap.exists()) {
        const existingData = docSnap.data();
        await setDoc(docRef, {
          storyName,
          chapterName,
          url: currentUrl,
          sourceHost,
          userId,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          storyName,
          chapterName,
          url: currentUrl,
          sourceHost,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Refresh local list
      fetchReadingHistory(userId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  const deleteReadingHistoryItem = async (id: string) => {
    const path = `reading_history/${id}`;
    try {
      await deleteDoc(doc(db, "reading_history", id));
      setReadingHistoryList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const [fontType, setFontType] = useState<FontType>("serif");

  const fetchStory = async (targetUrl: string) => {
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
      if (user) {
        saveReadingHistory(data.title, targetUrl);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định khi tải truyện.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualContent.trim()) {
      setError("Vui lòng dán nội dung truyện.");
      return;
    }
    const finalTitle = manualTitle.trim() || "Chương không tên";
    setStory({
      title: finalTitle,
      content: manualContent,
      rawUrl: "manual-input"
    });
    setRefinedContent("");
    setShowRefined(false);
    setError(null);
    if (user) {
      saveReadingHistory(finalTitle, "manual-input");
    }
  };

  const refineWithAI = async () => {
    if (!story) return;
    setIsRefining(true);
    setShowRefined(true);
    setRefinedContent("");
    setError(null);

    try {
      const prompt = `
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
        ${story.content.substring(0, 30000)}
      `;

      const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      let fullText = "";
      for await (const chunk of response) {
        fullText += chunk.text;
        setRefinedContent(fullText);
      }
    } catch (err) {
      console.error("AI Error:", err);
      alert("Lỗi khi xử lý AI. Vui lòng thử lại.");
    } finally {
      setIsRefining(false);
    }
  };

  const themes: Record<Theme, string> = {
    light: "bg-white text-slate-800 border-gray-200",
    dark: "bg-slate-900 text-slate-300 border-slate-800",
    sepia: "bg-[#FCF9F1] text-slate-800 border-amber-200/50",
  };

  return (
    <div id="app-root" className="flex flex-col h-screen bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      {/* Sleek Navigation */}
      <nav id="top-nav" className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#1E293B] shrink-0">
        <div id="nav-brand" className="flex items-center gap-2 cursor-pointer" onClick={() => setStory(null)}>
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">VN</div>
          <span className="text-xl font-semibold tracking-tight">Linh Ngữ AI <span className="text-indigo-400">v2.0</span></span>
        </div>
        <div id="nav-actions" className="flex items-center gap-6 text-sm text-slate-400">
          <span 
            id="nav-btn-history" 
            className={cn("hover:text-white cursor-pointer transition-colors", view === "history" && "text-indigo-400 font-medium")} 
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                setStory(null);
                setView("history");
              }
            }}
          >
            Lịch sử đọc
          </span>
          <span 
            id="nav-btn-convert" 
            className={cn("hover:text-white cursor-pointer transition-colors font-medium", (story || view === "home") && !story ? "text-indigo-400" : (story ? "text-indigo-400" : "text-slate-400"))}
            onClick={() => { setStory(null); setView("home"); }}
          >
            Chuyển ngữ URL
          </span>
          <span id="nav-badge-plan" className="hover:text-white cursor-pointer transition-colors text-xs bg-slate-700 px-2 py-1 rounded">
            {user ? "Premium Plan" : "Free Plan"}
          </span>
          {user ? (
            <div className="flex items-center gap-2">
              <div id="nav-user" className="w-8 h-8 rounded-full bg-indigo-600 border border-slate-500 flex items-center justify-center overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" /> : <Settings size={14} className="text-white" />}
              </div>
              <button onClick={() => signOut()} className="hover:text-white transition-colors" title="Đăng xuất"><LogOut size={16} /></button>
            </div>
          ) : (
            <button 
              onClick={() => signIn()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-colors"
            >
              <LogIn size={14} /> Đăng nhập
            </button>
          )}
        </div>
      </nav>

      <div id="main-container" className="flex-1 flex overflow-hidden">
        {/* Sidebar Logic */}
        <AnimatePresence mode="wait">
          {story && (
            <motion.aside 
              id="story-sidebar"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="w-80 border-r border-slate-800 bg-[#111827] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto"
            >
              <div id="sidebar-source" className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nguồn truyện</label>
                <div className="relative">
                  <input 
                    id="url-input-sidebar"
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none pr-10 text-slate-300"
                    placeholder="Dán URL mới..."
                  />
                  <div id="quick-fetch-btn" className="absolute right-3 top-2.5 text-indigo-400 cursor-pointer" onClick={() => fetchStory(url)}>
                    <ExternalLink size={18} />
                  </div>
                </div>
                <button 
                  id="refresh-content-btn"
                  onClick={() => fetchStory(url)}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? "Đang tải..." : "Làm mới nội dung"}</span>
                  <Loader2 className={cn("inline-block", loading ? "animate-spin" : "hidden")} size={16} />
                </button>
              </div>

              <div id="sidebar-ai-config" className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cấu hình AI</label>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">Chế độ biên tập</span>
                    <span className="text-xs text-indigo-400">Mượt mà</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-full"></div>
                  </div>
                </div>
                
                <div id="ai-actions" className="space-y-3">
                   <button 
                    id="toggle-ai-btn"
                    onClick={refinedContent ? () => setShowRefined(!showRefined) : refineWithAI}
                    disabled={isRefining}
                    className={cn(
                      "w-auto px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                      showRefined ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    )}
                   >
                    <Sparkles size={14} /> {isRefining ? "Đang tinh luyện..." : refinedContent ? (showRefined ? "Xem bản gốc" : "Xem bản AI") : "Biên tập AI"}
                   </button>
                   
                   <div id="appearance-controls" className="space-y-4 pt-2">
                    <div id="theme-controls" className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="flex bg-slate-800 rounded-lg p-1">
                        <button id="theme-light" onClick={() => setTheme("light")} className={cn("p-1 rounded cursor-pointer transition-colors", theme === "light" && "bg-slate-600")}><Sun size={14} /></button>
                        <button id="theme-sepia" onClick={() => setTheme("sepia")} className={cn("p-1 rounded cursor-pointer transition-colors", theme === "sepia" && "bg-slate-600")}><Coffee size={14} /></button>
                        <button id="theme-dark" onClick={() => setTheme("dark")} className={cn("p-1 rounded cursor-pointer transition-colors", theme === "dark" && "bg-slate-600")}><Moon size={14} /></button>
                      </div>
                      <span className="text-xs opacity-60 ml-2">Màu nền</span>
                    </div>

                    <div id="font-controls" className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="flex bg-slate-800 rounded-lg p-1">
                        <button id="font-serif" onClick={() => setFontType("serif")} className={cn("px-2 py-1 text-xs rounded cursor-pointer transition-colors", fontType === "serif" && "bg-slate-600")}>Serif</button>
                        <button id="font-sans" onClick={() => setFontType("sans")} className={cn("px-2 py-1 text-xs rounded cursor-pointer transition-colors", fontType === "sans" && "bg-slate-600")}>Sans</button>
                      </div>
                      <span className="text-xs opacity-60 ml-2">Phông chữ</span>
                    </div>

                    <div id="font-size-controls" className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="flex bg-slate-800 rounded-lg p-1 items-center">
                        <button 
                          id="font-decrease" 
                          onClick={() => setFontSize(Math.max(12, fontSize - 2))} 
                          className="px-2 py-0.5 text-xs font-bold rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer select-none"
                          title="Nhỏ lại (A-)"
                        >
                          A-
                        </button>
                        <span className="text-xs text-slate-300 font-mono font-semibold px-2 select-none min-w-[28px] text-center">{fontSize}px</span>
                        <button 
                          id="font-increase" 
                          onClick={() => setFontSize(Math.min(32, fontSize + 2))} 
                          className="px-2 py-0.5 text-xs font-bold rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer select-none"
                          title="To hơn (A+)"
                        >
                          A+
                        </button>
                      </div>
                      <span className="text-xs opacity-60 ml-2">Cỡ chữ</span>
                    </div>
                   </div>
                </div>
              </div>

              <div id="footer-note" className="mt-auto p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl">
                <p className="text-[11px] text-indigo-300 leading-relaxed font-mono">
                  Hệ thống đang sử dụng mô hình <strong>Gemini 3 Flash</strong>. Tinh lọc ngôn ngữ tự nhiên.
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <section 
          id="reader-section" 
          className={cn(
            "flex-1 p-0 md:p-12 overflow-hidden flex flex-col shadow-inner relative transition-colors duration-300",
            story ? (
              theme === "sepia" ? "bg-[#FCF9F1]" : theme === "dark" ? "bg-[#0F172A]" : "bg-white"
            ) : "bg-[#FCF9F1]"
          )}
        >
          <div id="reader-scroll-container" ref={readerScrollRef} className="absolute inset-0 overflow-y-auto">
            <div id="reader-content-wrapper" className="max-w-2xl mx-auto w-full px-4 py-12 flex flex-col min-h-full">
              {view === "history" && !story ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex-1"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
                      <History className="text-indigo-600 animate-pulse" /> Lịch sử đọc truyện
                    </h2>
                    <button onClick={() => setView("home")} className="text-sm font-medium text-indigo-600 hover:underline">Về màn hình chính</button>
                  </div>
                  {readingHistoryList.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <History size={32} />
                      </div>
                      <p className="text-slate-500 font-medium px-4">Lịch sử đọc của bạn đang trống.</p>
                      <p className="text-xs text-slate-400 mt-1 px-4">Khi bạn đọc truyện qua đường link, lịch sử sẽ tự động được ghi nhận tại đây.</p>
                      {!user && (
                        <button onClick={() => signIn()} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                          Đăng nhập để đồng bộ đám mây
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {readingHistoryList.map(item => (
                         <motion.div 
                          layout
                          key={item.id} 
                          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
                        >
                            {confirmDeleteId === item.id && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-10 text-center"
                              >
                                <p className="text-sm font-medium text-white mb-3">Xóa lịch sử truyện này?</p>
                                <div className="flex gap-2 justify-center">
                                  <button 
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    Hủy
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await deleteReadingHistoryItem(item.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors hover:shadow-lg hover:shadow-red-900/30"
                                  >
                                    Xác nhận
                                  </button>
                                </div>
                              </motion.div>
                            )}
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 
                                  className="font-bold font-serif text-slate-900 leading-tight text-lg group-hover:text-indigo-600 cursor-pointer" 
                                  onClick={() => fetchStory(item.url)}
                                >
                                  {item.storyName}
                                </h3>
                                <button 
                                  onClick={() => setConfirmDeleteId(item.id)} 
                                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                  title="Xóa khỏi lịch sử"
                                >
                                  <Trash size={15} />
                                </button>
                              </div>
                              <p className="text-sm text-indigo-600 font-semibold mb-2">{item.chapterName}</p>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <ExternalLink size={12} className="inline opacity-70" /> {item.sourceHost}
                              </span>
                              
                              <button 
                                onClick={() => {
                                  fetchStory(item.url);
                                  setView("home");
                                }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Đọc tiếp
                              </button>
                            </div>
                         </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : !story ? (
                <motion.div 
                  id="landing-hero"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center text-slate-900"
                >
                   <div id="hero-icon" className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-500/40">
                      <BookOpen size={32} />
                   </div>
                   <h2 className="text-3xl font-serif font-bold mb-4">Tinh lọc nội dung, nâng tầm trải nghiệm</h2>
                   <p className="text-slate-500 mb-8 max-w-sm">Chuyển đổi truyện convert sang tiếng Việt mượt mà với AI.</p>
                   
                   <div id="search-box-container" className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button 
                          onClick={() => setIsManualInput(false)}
                          className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", !isManualInput ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                        >
                          Dùng URL
                        </button>
                        <button 
                          onClick={() => setIsManualInput(true)}
                          className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", isManualInput ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                        >
                          Dán trực tiếp
                        </button>
                      </div>

                      {!isManualInput ? (
                        <div className="flex gap-2">
                          <input 
                            id="url-input-main"
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://truyen.com/..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            onKeyDown={(e) => e.key === "Enter" && fetchStory(url)}
                          />
                          <button 
                            id="main-fetch-btn"
                            onClick={() => fetchStory(url)}
                            disabled={loading}
                            className="bg-indigo-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-indigo-500 transition-all disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Tìm kiếm"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="Tiêu đề chương (không bắt buộc)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          />
                          <textarea 
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                            placeholder="Dán nội dung truyện convert tại đây..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[200px] text-slate-800"
                          />
                          <button 
                            onClick={handleManualSubmit}
                            className="w-full bg-indigo-600 text-white rounded-xl py-4 font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
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
              ) : (
                <div id="story-reader" className={cn("transition-all duration-300 flex-1 flex flex-col", themes[theme], "p-8 md:p-0 bg-transparent border-0")}>
                  <header 
                    id="story-header"
                    className={cn(
                      "mb-8 border-b pb-6",
                      theme === "sepia" ? "border-amber-200" : theme === "dark" ? "border-slate-800" : "border-slate-200"
                    )}
                  >
                    {currentStoryInfo && (
                      <div className="mb-2 text-sm font-bold tracking-widest uppercase text-indigo-500 font-sans">
                        {currentStoryInfo.storyName}
                      </div>
                    )}
                    <h1 
                      id="story-title"
                      className={cn(
                        "text-3xl font-serif font-bold mb-2 leading-tight transition-colors",
                        theme === "dark" ? "text-slate-200" : "text-slate-900"
                      )}
                    >
                      {currentStoryInfo ? currentStoryInfo.chapterName : story.title}
                    </h1>
                    <div id="story-meta" className="flex gap-4 text-sm text-slate-500 font-medium items-center">
                      <span className="flex items-center gap-1"><BookOpen size={14} /> AI Biên tập</span>
                      <span className="flex items-center gap-1 opacity-60">
                        {showRefined ? "Bản mượt mà" : "Bản dịch thô"}
                      </span>
                      <div className="flex gap-4 ml-auto items-center">
                        <button 
                          onClick={copyToClipboard}
                          className={cn(
                            "text-sm font-bold flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-lg",
                            copied ? "bg-green-100 text-green-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
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
                      "leading-relaxed space-y-6 flex-1 transition-all duration-300",
                      fontType === "serif" ? "font-serif" : "font-sans",
                      theme === "dark" ? "text-slate-400" : "text-slate-700"
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {(showRefined ? refinedContent : story.content).split('\n').map((line, i) => (
                      line.trim() && <p key={i} className="mb-6">{line.trim()}</p>
                    ))}
                    
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
                      "mt-12 flex justify-between items-center py-6 border-t font-medium text-sm",
                      theme === "sepia" ? "border-amber-200 text-slate-500" : theme === "dark" ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                    )}
                  >
                    <div id="chap-nav" className="flex gap-4">
                      {story.prevUrl ? (
                        <button 
                          id="prev-chap-btn" 
                          onClick={() => fetchStory(story.prevUrl!)}
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
                          onClick={() => fetchStory(story.nextUrl!)}
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
              )}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showAuthModal && (
          <div key="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              layoutId="auth-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            
            {/* Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl text-slate-200 overflow-hidden"
            >
              {/* Card subtle radiant glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Animated/Beautiful Icon Container */}
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Bookmark size={24} className="animate-pulse" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Tính Năng Giới Hạn</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Bạn cần đăng nhập để sử dụng tính năng <strong>Lịch sử đọc</strong>. Đăng nhập giúp tự động lưu trữ, phục hồi chương đọc dở và đồng bộ truyện trên mọi thiết bị.
                </p>
                
                {/* Action buttons */}
                <div className="w-full flex flex-col gap-2.5">
                  <button
                    onClick={async () => {
                      setShowAuthModal(false);
                      await signIn();
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/20 duration-200 group active:scale-[0.98] cursor-pointer"
                  >
                    <LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    Đăng nhập Google
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-medium rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
