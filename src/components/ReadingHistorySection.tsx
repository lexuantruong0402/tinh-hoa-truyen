import { motion } from "motion/react";
import { History, ExternalLink, Trash } from "lucide-react";
import { ReadingHistory } from "@/src/types";

interface ReadingHistorySectionProps {
  readingHistoryList: ReadingHistory[];
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string | null) => void;
  onDeleteItem: (id: string) => void;
  onFetchStory: (url: string) => void;
  onBackToHome: () => void;
}

export default function ReadingHistorySection({
  readingHistoryList,
  confirmDeleteId,
  onConfirmDelete,
  onDeleteItem,
  onFetchStory,
  onBackToHome,
}: ReadingHistorySectionProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 px-0 md:px-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <History className="text-indigo-600 animate-pulse size-5 md:size-7" /> Lịch sử đọc truyện
        </h2>
        <button onClick={onBackToHome} className="text-xs md:text-sm font-medium text-indigo-600 hover:underline">
          Về màn hình chính
        </button>
      </div>
      {readingHistoryList.length === 0 ? (
        <div className="text-center py-12 md:py-20 bg-white/50 rounded-2xl md:rounded-3xl border border-dashed border-slate-300">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <History size={24} className="md:size-[32px]" />
          </div>
          <p className="text-sm md:text-base text-slate-500 font-medium px-4">Lịch sử đọc của bạn đang trống.</p>
          <p className="text-xs text-slate-400 mt-1 px-4">
            Khi bạn đọc truyện qua đường link, lịch sử sẽ tự động được ghi nhận tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {readingHistoryList.map((item) => (
            <motion.div
              layout
              key={item.id}
              className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
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
                      onClick={() => onConfirmDelete(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={async () => {
                        await onDeleteItem(item.id);
                        onConfirmDelete(null);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors hover:shadow-lg hover:shadow-red-900/30"
                    >
                      Xác nhận
                    </button>
                  </div>
                </motion.div>
              )}
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3
                    className="font-bold font-serif text-slate-900 leading-tight text-base md:text-lg group-hover:text-indigo-600 cursor-pointer line-clamp-2"
                    onClick={() => onFetchStory(item.url)}
                  >
                    {item.storyName}
                  </h3>
                  <button
                    onClick={() => onConfirmDelete(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"
                    title="Xóa khỏi lịch sử"
                  >
                    <Trash size={15} />
                  </button>
                </div>
                <p className="text-xs md:text-sm text-indigo-600 font-semibold mb-2 line-clamp-1">{item.chapterName}</p>
              </div>

              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded truncate max-w-[50%]">
                  <ExternalLink size={12} className="inline opacity-70 shrink-0" /> <span className="truncate">{item.sourceHost}</span>
                </span>

                <button
                  onClick={() => {
                    onFetchStory(item.url);
                  }}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  Đọc tiếp
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}