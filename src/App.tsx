import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import { useStory } from "@/src/hooks/useStory";
import { useReadingHistory } from "@/src/hooks/useReadingHistory";
import { useReaderSettings } from "@/src/hooks/useReaderSettings";
import Navigation from "@/src/components/Navigation";
import StorySidebar from "@/src/components/StorySidebar";
import StoryReader from "@/src/components/StoryReader";
import LandingHero from "@/src/components/LandingHero";
import ReadingHistorySection from "@/src/components/ReadingHistorySection";
import AuthModal from "@/src/components/AuthModal";

export default function App() {
  const { user, showAuthModal, setShowAuthModal, signIn, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    url, setUrl,
    manualTitle, setManualTitle,
    manualContent, setManualContent,
    isManualInput, setIsManualInput,
    loading, story, setStory,
    refinedContent, isRefining, showRefined, setShowRefined,
    error, copied,
    fetchStory, handleManualSubmit, refineWithAI, copyToClipboard,
    currentStoryInfo, readerScrollRef,
    autoRefine, setAutoRefine,
    aiMode, setAiMode,
    detectedInfo,
  } = useStory();
  const { readingHistoryList, confirmDeleteId, setConfirmDeleteId, view, setView, saveReadingHistory, deleteItem } =
    useReadingHistory(user?.uid ?? null);
  const { theme, setTheme, fontSize, fontType, setFontType, decreaseFontSize, increaseFontSize, themes } =
    useReaderSettings();

  // Scroll to top when story changes
  useEffect(() => {
    if (story && readerScrollRef.current) {
      readerScrollRef.current.scrollTop = 0;
    }
  }, [story, readerScrollRef]);

  // Save to reading history only when detectedInfo (from detectChapterInfo) is available
  useEffect(() => {
    if (story && user && detectedInfo && detectedInfo.storyName) {
      saveReadingHistory(story.title, story.rawUrl || url, detectedInfo);
    }
  }, [detectedInfo]); // only trigger when detectedInfo updates

  const handleHomeClick = () => {
    setStory(null);
    setView("home");
  };

  const handleAIToggle = () => {
    if (refinedContent) {
      setShowRefined(!showRefined);
    } else {
      refineWithAI();
    }
  };

  const handleFetchChapter = (chapterUrl: string) => {
    fetchStory(chapterUrl);
  };

  return (
    <div id="app-root" className="flex flex-col h-screen bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      <Navigation
        view={view}
        storyExists={!!story}
        onViewChange={(v) => { setView(v); setStory(null); }}
        onHomeClick={handleHomeClick}
        user={user}
        signIn={signIn}
        signOut={signOut}
        setShowAuthModal={setShowAuthModal}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div id="main-container" className="flex-1 flex overflow-hidden relative">
        {story && (
          <StorySidebar
            url={url}
              onUrlChange={setUrl}
              onFetch={() => fetchStory(url)}
              loading={loading}
              isRefining={isRefining}
              refinedContent={refinedContent}
              showRefined={showRefined}
              onToggleAI={handleAIToggle}
              theme={theme}
              onThemeChange={setTheme}
              fontType={fontType}
              onFontTypeChange={setFontType}
              fontSize={fontSize}
              onFontSizeDecrease={decreaseFontSize}
              onFontSizeIncrease={increaseFontSize}
              sidebarOpen={sidebarOpen}
              onCloseSidebar={() => setSidebarOpen(false)}
              autoRefine={autoRefine}
              onAutoRefineChange={setAutoRefine}
              aiMode={aiMode}
              onAiModeChange={setAiMode}
          />
        )}

        <section
          id="reader-section"
          className={cn(
            "flex-1 p-0 md:p-12 overflow-hidden flex flex-col shadow-inner relative transition-colors duration-300",
            story ? (
              theme === "sepia" ? "bg-[#FCF9F1]" : theme === "dark" ? "bg-[#0F172A]" : "bg-white"
            ) : "bg-[#FCF9F1]",
          )}
        >
          <div id="reader-scroll-container" ref={readerScrollRef} className="absolute inset-0 overflow-y-auto">
          <div id="reader-content-wrapper" className="max-w-2xl mx-auto w-full px-3 md:px-4 py-6 md:py-12 flex flex-col min-h-full">
              {view === "history" && !story ? (
                <ReadingHistorySection
                  readingHistoryList={readingHistoryList}
                  confirmDeleteId={confirmDeleteId}
                  onConfirmDelete={setConfirmDeleteId}
                  onDeleteItem={deleteItem}
                  onFetchStory={(url) => {
                    fetchStory(url);
                    setView("home");
                  }}
                  onBackToHome={handleHomeClick}
                />
              ) : !story ? (
                <LandingHero
                  url={url}
                  onUrlChange={setUrl}
                  onFetch={() => fetchStory(url)}
                  loading={loading}
                  isManualInput={isManualInput}
                  onToggleInputMode={setIsManualInput}
                  manualTitle={manualTitle}
                  onManualTitleChange={setManualTitle}
                  manualContent={manualContent}
                  onManualContentChange={setManualContent}
                  onManualSubmit={handleManualSubmit}
                  error={error}
                />
              ) : (
                  <StoryReader
                    story={story}
                    theme={theme}
                    fontType={fontType}
                    fontSize={fontSize}
                    themes={themes}
                    showRefined={showRefined}
                    refinedContent={refinedContent}
                    isRefining={isRefining}
                    copied={copied}
                    currentStoryInfo={currentStoryInfo}
                    loading={loading}
                    onCopy={copyToClipboard}
                    onFetchChapter={handleFetchChapter}
                    aiMode={aiMode}
                  />
              )}
            </div>
          </div>
        </section>
      </div>

      <AuthModal
        show={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={signIn}
      />
    </div>
  );
}