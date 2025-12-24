
import { GoogleGenAI, VideoGenerationReferenceType } from "@google/genai";
import { VideoGenerationParams } from "../types";

export const generateVideo = async (
  params: VideoGenerationParams,
  onProgress: (message: string) => void
): Promise<string> => {
  // Always create a new instance right before use to get the latest key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const referenceImagesPayload: any[] = [];
  
  // Use first 2 subject images and the product image
  const subjectImages = params.subjectImages.filter(img => img !== '').slice(0, 2);
  
  subjectImages.forEach((base64) => {
    const data = base64.split(',')[1];
    const mimeType = base64.split(';')[0].split(':')[1];
    referenceImagesPayload.push({
      image: {
        imageBytes: data,
        mimeType: mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  });

  if (params.productImage && referenceImagesPayload.length < 3) {
    const data = params.productImage.split(',')[1];
    const mimeType = params.productImage.split(';')[0].split(':')[1];
    referenceImagesPayload.push({
      image: {
        imageBytes: data,
        mimeType: mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  }

  const finalPrompt = `
NHIỆM VỤ:
Tạo video dựa trên hình ảnh chủ thể ở mục 1 hãy giữ nguyên 100% khuôn mặt, góc mặt.

Bối cảnh: ${params.backgroundPrompt || 'Trong studio chuyên nghiệp'}
Hành động của nhân vật: ${params.actionPrompt || 'Nhân vật đứng tự nhiên trước ống kính'}
Lời nói / Biểu cảm: ${params.speechPrompt || 'Biểu cảm tự nhiên, hài lòng'}

CÁC YÊU CẦU QUAN TRỌNG VỀ NHẬN DẠNG:
- Giữ nguyên khuôn mặt nhân vật với độ chính xác tuyệt đối.
- Không chỉnh sửa hình dạng khuôn mặt, không làm đẹp, không thay đổi tuổi tác, không làm mịn da.
- Tỷ lệ khuôn mặt, mắt, mũi, môi, đường viền hàm phải giống hệt với hình ảnh gốc đã tải lên.

QUY TẮC BẢO TỒN SẢN PHẨM:
- Mỗi sản phẩm phải giữ nguyên 100% về: hình dạng, thể tích, đường nét, tỷ lệ, chất liệu vải, đường may, logo, màu sắc và đặc tính vật liệu.
- KHÔNG được làm thon gọn, chỉnh sửa, thay đổi kích thước, tạo kiểu, thiết kế lại hoặc diễn giải lại bất kỳ sản phẩm nào.
  `.trim();

  onProgress("Đang khởi tạo yêu cầu AI...");

  try {
    // Determine model and forced config based on features used
    // If using multiple references, we MUST use veo-3.1-generate-preview and 16:9/720p
    const modelName = 'veo-3.1-generate-preview';
    
    let operation = await ai.models.generateVideos({
      model: modelName,
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', // Required for generate-preview
        referenceImages: referenceImagesPayload,
        aspectRatio: params.aspectRatio // Try user preference, but model might override
      }
    });

    onProgress("AI đã nhận yêu cầu. Đang xử lý... (Quá trình này có thể mất vài phút)");

    let retryCount = 0;
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (pollError: any) {
        console.warn("Polling error, retrying...", pollError);
        retryCount++;
        if (retryCount > 5) throw pollError;
      }
      
      onProgress("Đang tạo video... Vui lòng không đóng trình duyệt.");
    }

    if (operation.error) {
        throw new Error(operation.error.message || "Lỗi không xác định từ AI server");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video đã tạo xong nhưng không tìm thấy link tải.");

    // The fetch must append the key as per instructions
    const fetchResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!fetchResponse.ok) throw new Error("Không thể tải video từ server Google.");
    
    // Create a local blob to ensure video is playable
    const videoBlob = await fetchResponse.blob();
    return URL.createObjectURL(videoBlob);
    
  } catch (error: any) {
    // Fix: Ensure we are checking a string to avoid type errors in catch block
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Requested entity was not found")) {
        throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
};
