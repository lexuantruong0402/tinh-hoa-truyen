import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function refineStoryContent(storyContent: string, onChunk: (text: string) => void): Promise<string> {
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
    ${storyContent.substring(0, 30000)}
  `;

  const response = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  let fullText = "";
  for await (const chunk of response) {
    fullText += chunk.text;
    onChunk(fullText);
  }

  return fullText;
}