import { motion, AnimatePresence } from "motion/react";
import { Bookmark, LogIn } from "lucide-react";

interface AuthModalProps {
  show: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export default function AuthModal({ show, onClose, onSignIn }: AuthModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div key="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            layoutId="auth-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl text-slate-200 overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Bookmark size={24} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Tính Năng Giới Hạn</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Bạn cần đăng nhập để sử dụng tính năng <strong>Lịch sử đọc</strong>. Đăng nhập giúp tự động lưu trữ,
                phục hồi chương đọc dở và đồng bộ truyện trên mọi thiết bị.
              </p>
              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    onClose();
                    await onSignIn();
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/20 duration-200 group active:scale-[0.98] cursor-pointer"
                >
                  <LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  Đăng nhập Google
                </button>
                <button
                  onClick={onClose}
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
  );
}