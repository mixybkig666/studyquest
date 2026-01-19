
import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Book } from '../types';

interface ImmersiveReadingModeProps {
  book: Book; // 当前预设的书（如果任务指定了）
  allBooks: Book[]; // 供选择的书架
  readingContent?: { title: string; content: string };
  onExit: () => void;
  onFinish: (durationSeconds: number, reflection: string, selectedBookTitle: string) => void;
}

export const ImmersiveReadingMode: React.FC<ImmersiveReadingModeProps> = ({
  book,
  allBooks,
  targetDurationMinutes = 20,
  readingContent,
  onExit,
  onFinish
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [reflection, setReflection] = useState('');

  // 如果有阅读内容，默认书名使用内容的标题
  const [finalBookTitle, setFinalBookTitle] = useState(
    readingContent?.title || (book.title === '自由阅读' ? '' : book.title)
  );
  const [isCustomBook, setIsCustomBook] = useState(book.title === '自由阅读' && !readingContent);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // ... (timer logic kept same) ...
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [lastPauseStart, setLastPauseStart] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (!lastPauseStart) setLastPauseStart(Date.now());
      return;
    }
    if (lastPauseStart) {
      setPausedTime(prev => prev + (Date.now() - lastPauseStart));
      setLastPauseStart(null);
    }
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      setSeconds(elapsed);
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [isActive, startTime, pausedTime, lastPauseStart]);

  // ... (visibility logic kept same) ...
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        // console.log('[ImmersiveReading] Page hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  const handleAttemptFinish = () => {
    setIsActive(false);
    setShowFinishModal(true);
  };

  const handleConfirmFinish = () => {
    if (!finalBookTitle.trim()) {
      alert("请告诉我们你读了什么书哦！");
      return;
    }
    // 如果有预设内容，不强制写读后感
    if (!readingContent && !reflection.trim()) {
      alert("请至少写一句读后感哦，记录下你的思考！");
      return;
    }
    onFinish(seconds, reflection, finalBookTitle);
  };

  const progress = Math.min((seconds / (targetDurationMinutes * 60)) * 100, 100);
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F7F2] flex flex-col font-serif text-gray-800 animate-fade-in selection:bg-brand-orange selection:text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")' }}></div>

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-[#F9F7F2] to-transparent">
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
          <i className="fas fa-times text-xl"></i>
        </button>
        <div className="text-xs font-sans font-bold text-gray-400 tracking-widest uppercase bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
          Immersive Reading
        </div>

        {/* Timer Mini Display (visible when content is shown) */}
        {readingContent && (
          <div className={`font-mono text-xl font-bold ${isActive ? 'text-brand-teal' : 'text-gray-400'}`}>
            {formatTime(seconds)}
          </div>
        )}
        {!readingContent && <div className="w-8"></div>}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 w-full max-w-4xl mx-auto px-6 pt-20 pb-6 overflow-hidden">

        {readingContent ? (
          // --- Content View ---
          <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-3xl shadow-sm border border-stone-100">
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <h1 className="text-3xl font-bold text-center mb-8 text-stone-800 border-b pb-4 border-stone-100">
                {readingContent.title}
              </h1>
              <div className="prose prose-lg max-w-none text-stone-700 leading-loose">
                {readingContent.content.split('\n').map((para, idx) => (
                  <p key={idx} className="mb-6 indent-8 text-justify">{para}</p>
                ))}
              </div>
            </div>

            {/* Bottom Controls for Content View */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-between items-center px-8">
              <button
                onClick={toggleTimer}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isActive ? 'bg-white border-2 border-yellow-200 text-yellow-500' : 'bg-brand-teal text-white shadow-lg'}`}
              >
                <i className={`fas ${isActive ? 'fa-pause' : 'fa-play pl-1'}`}></i>
              </button>

              <button
                onClick={handleAttemptFinish}
                className="bg-brand-textDark text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                <span>完成阅读</span>
                <i className="fas fa-check"></i>
              </button>
            </div>
          </div>
        ) : (
          // --- Timer View (Original) ---
          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8 leading-snug line-clamp-2">
              {book.title === '自由阅读' && finalBookTitle ? `《${finalBookTitle}》` : `《${book.title}》`}
            </h1>

            <div className="relative flex items-center justify-center mb-10">
              <svg className="transform -rotate-90 w-[300px] h-[300px]">
                <circle cx="150" cy="150" r={radius} stroke="#E5E7EB" strokeWidth="8" fill="transparent" />
                <circle cx="150" cy="150" r={radius} stroke="#2DD4BF" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-6xl font-black tabular-nums tracking-tighter leading-none select-none transition-colors ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                  {formatTime(seconds)}
                </div>
                <div className="text-sm text-gray-400 mt-2 font-sans font-bold uppercase tracking-wide">Target: {targetDurationMinutes} min</div>
                <div className={`mt-4 text-xs font-bold px-3 py-1 rounded-full transition-all ${isActive ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-yellow-100 text-yellow-600'}`}>
                  {isActive ? 'FOCUSING' : 'PAUSED'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button onClick={toggleTimer} className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 ${isActive ? 'bg-white text-yellow-500 border-2 border-yellow-100' : 'bg-brand-teal text-white shadow-brand-teal/30'}`}>
                <i className={`fas ${isActive ? 'fa-pause' : 'fa-play pl-1'}`}></i>
              </button>
              <button onClick={handleAttemptFinish} className="h-16 px-8 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:bg-gray-800 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3">
                <i className="fas fa-check"></i>
                <span>完成阅读</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 完成弹窗 */}
      {showFinishModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-slide-up">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">🎉 阅读打卡</h3>

            {/* 书籍选择部分 */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">刚才读了什么书？</label>
              {allBooks.length > 0 && !isCustomBook && (
                <select
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 mb-2 focus:border-brand-teal focus:ring-0 text-gray-700"
                  value={finalBookTitle}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomBook(true);
                      setFinalBookTitle('');
                    } else {
                      setFinalBookTitle(e.target.value);
                    }
                  }}
                >
                  <option value="">-- 请选择书籍 --</option>
                  {allBooks.map(b => <option key={b.id} value={b.title}>《{b.title}》</option>)}
                  <option value="__custom__">+ 输入新书名</option>
                </select>
              )}

              {(isCustomBook || allBooks.length === 0) && (
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    placeholder="输入书名，例如《西游记》"
                    value={finalBookTitle}
                    onChange={(e) => setFinalBookTitle(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-brand-mint focus:border-brand-teal focus:outline-none"
                  />
                  {allBooks.length > 0 && (
                    <button onClick={() => setIsCustomBook(false)} className="absolute right-3 top-3.5 text-xs text-gray-400 hover:text-brand-teal font-bold">
                      返回
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">读后感 / 思考</label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="有趣的情节？新学的知识？写下来吧..."
                className="w-full h-28 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-teal focus:bg-white focus:outline-none transition-all text-base resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowFinishModal(false)} className="flex-1">继续读</Button>
              <Button variant="primary" onClick={handleConfirmFinish} className="flex-1 shadow-lg shadow-brand-primary/30">打卡保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
