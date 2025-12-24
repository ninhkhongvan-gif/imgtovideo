
import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import { AspectRatio, OperationState } from './types';
import { generateVideo } from './services/geminiService';

const App: React.FC = () => {
  const [subjectImages, setSubjectImages] = useState<string[]>(['', '', '', '']);
  const [productImage, setProductImage] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [actionPrompt, setActionPrompt] = useState('');
  const [speechPrompt, setSpeechPrompt] = useState('');
  const [hasKey, setHasKey] = useState<boolean>(true);
  
  const [opState, setOpState] = useState<OperationState>({
    id: '',
    status: 'idle',
    progressMessage: ''
  });

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // @ts-ignore
    const selected = await window.aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleSubjectImage = (index: number, base64: string) => {
    const newImages = [...subjectImages];
    newImages[index] = base64;
    setSubjectImages(newImages);
  };

  const clearSubjectImage = (index: number) => {
    const newImages = [...subjectImages];
    newImages[index] = '';
    setSubjectImages(newImages);
  };

  const handleSubmit = async () => {
    const availableSubjects = subjectImages.filter(img => img !== '');
    if (availableSubjects.length === 0) {
      alert('Vui lòng tải lên ít nhất 1 ảnh khuôn mặt chủ thể.');
      return;
    }

    setOpState({ ...opState, status: 'processing', progressMessage: 'Bắt đầu khởi tạo...' });

    try {
      const videoUrl = await generateVideo({
        subjectImages: availableSubjects,
        productImage: productImage || undefined,
        aspectRatio,
        backgroundPrompt,
        actionPrompt,
        speechPrompt
      }, (msg) => {
        setOpState(prev => ({ ...prev, progressMessage: msg }));
      });

      setOpState({
        ...opState,
        status: 'done',
        progressMessage: 'Hoàn thành!',
        videoUrl
      });
    } catch (error: any) {
      console.error("Video Generation Error:", error);
      let errorMsg = error.message;
      
      if (errorMsg === 'AUTH_REQUIRED' || errorMsg.includes("Requested entity was not found")) {
        alert('Yêu cầu chọn API Key từ dự án có bật thanh toán (Paid Project).');
        handleSelectKey();
      } else {
        alert('Lỗi: ' + errorMsg);
      }
      
      setOpState({ ...opState, status: 'error', progressMessage: 'Lỗi: ' + errorMsg });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {!hasKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Yêu cầu API Key</h2>
            <p className="text-slate-400 mb-6">Để sử dụng mô hình video Veo, bạn cần chọn một API Key từ dự án Google Cloud đã bật thanh toán.</p>
            <button 
              onClick={handleSelectKey}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all mb-4"
            >
              Chọn API Key ngay
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="text-sm text-blue-400 hover:underline"
            >
              Tìm hiểu về yêu cầu thanh toán
            </a>
          </div>
        </div>
      )}

      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          AI Image to Video Studio
        </h1>
        <p className="text-slate-400">Chuyển đổi hình ảnh thành video chân thực, giữ nguyên khuôn mặt và sản phẩm.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-2xl">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">1</span>
              Ảnh chủ thể (Nhiều góc mặt)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {subjectImages.map((img, idx) => (
                <ImageUploader 
                  key={idx}
                  id={`subject-${idx}`}
                  label={`Ảnh ${idx + 1}`}
                  currentImage={img}
                  onImageSelect={(b64) => handleSubjectImage(idx, b64)}
                  onClear={() => clearSubjectImage(idx)}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 italic">* Càng nhiều góc mặt, AI nhận diện càng chính xác. Khuôn mặt sẽ được giữ nguyên 100%.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">2</span>
              Ảnh sản phẩm (Tùy chọn)
            </h2>
            <div className="w-full max-w-[200px]">
              <ImageUploader 
                id="product-upload"
                label="Sản phẩm đính kèm"
                currentImage={productImage}
                onImageSelect={setProductImage}
                onClear={() => setProductImage('')}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">3</span>
              Cấu hình Video
            </h2>
            
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-slate-300">Tỷ lệ khung hình</label>
              <div className="flex gap-3">
                {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-6 py-2 rounded-lg border transition-all ${
                      aspectRatio === ratio 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {ratio === '16:9' ? 'Ngang (16:9)' : 'Dọc (9:16)'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-amber-500/80 italic mt-1">* Lưu ý: Chế độ đa ảnh tham chiếu hoạt động tốt nhất ở tỷ lệ 16:9.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-300">Bối cảnh (Background Prompt)</label>
                <textarea 
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  placeholder="Ví dụ: Trong một quán cà phê sang trọng, ánh sáng ấm áp ban chiều..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-300">Hành động của nhân vật</label>
                <textarea 
                  value={actionPrompt}
                  onChange={(e) => setActionPrompt(e.target.value)}
                  placeholder="Ví dụ: Nhân vật đang cầm sản phẩm, mỉm cười và gật đầu nhẹ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-300">Lời nói / Biểu cảm</label>
                <textarea 
                  value={speechPrompt}
                  onChange={(e) => setSpeechPrompt(e.target.value)}
                  placeholder="Ví dụ: Nhân vật nói lời chào mừng, biểu cảm hào hứng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                />
              </div>
            </div>
          </section>

          <button
            onClick={handleSubmit}
            disabled={opState.status === 'processing'}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-xl
              ${opState.status === 'processing' 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white transform hover:scale-[1.01] active:scale-[0.99]'}
            `}
          >
            {opState.status === 'processing' ? 'ĐANG TẠO VIDEO...' : 'BẮT ĐẦU TẠO VIDEO'}
          </button>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm sticky top-8 shadow-2xl">
            <h2 className="text-xl font-semibold mb-6">Kết quả</h2>
            
            {opState.status === 'idle' && (
              <div className="h-96 flex flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-950/50 text-slate-600 text-center p-8">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Thiết lập các thông số bên trái và nhấn nút để bắt đầu tạo video.</p>
              </div>
            )}

            {opState.status === 'processing' && (
              <div className="h-96 flex flex-col items-center justify-center border border-blue-900/30 rounded-xl bg-slate-950/50 text-center p-8">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-blue-400 font-medium mb-2 uppercase tracking-wide">Đang xử lý</h3>
                <p className="text-sm text-slate-400">{opState.progressMessage}</p>
                <div className="mt-8 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full animate-[loading_20s_infinite]"></div>
                </div>
                <p className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest">Powered by Gemini Veo</p>
              </div>
            )}

            {opState.status === 'done' && opState.videoUrl && (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                  <video 
                    src={opState.videoUrl} 
                    controls 
                    className="w-full h-auto"
                    autoPlay
                    loop
                  />
                </div>
                <a 
                  href={opState.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải video về máy
                </a>
                <button 
                  onClick={() => setOpState({ ...opState, status: 'idle', videoUrl: undefined })}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Tạo video mới
                </button>
              </div>
            )}

            {opState.status === 'error' && (
              <div className="h-96 flex flex-col items-center justify-center border border-red-900/30 rounded-xl bg-slate-950/50 text-center p-8">
                <svg className="w-16 h-16 mb-4 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-red-400 font-medium mb-2 uppercase tracking-wide">Đã xảy ra lỗi</h3>
                <p className="text-sm text-slate-500 mb-6">{opState.progressMessage}</p>
                <button 
                  onClick={() => setOpState({ ...opState, status: 'idle' })}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                >
                  Thử lại
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-16 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© 2024 AI Video Studio - Sử dụng công nghệ Gemini Veo 3.1</p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-blue-400 underline decoration-blue-500/30">Tài liệu thanh toán API</a>
        </div>
      </footer>

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
};

export default App;
