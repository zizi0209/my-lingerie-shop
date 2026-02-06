 # AI Voice Consultant & Chatbot - Implementation Plan
 
 ## Overview
 
 Tính năng **Tư vấn viên ảo giọng nữ & Chatbot** cho lingerie shop, sử dụng 100% công nghệ miễn phí.
 
 ## Tech Stack (100% FREE)
 
 | Component | Technology | Cost |
 |-----------|------------|------|
 | LLM (Primary) | Gemini API (Free Tier) | $0 |
 | LLM (Fallback) | Groq API (Free Tier) | $0 |
 | Speech-to-Text | Web Speech API | $0 |
 | Text-to-Speech | Web Speech API (giọng nữ) | $0 |
 | Chat UI | Custom Components + Tailwind | $0 |
 | Hosting | Vercel + Railway (Free Tier) | $0 |
 
 ## Free Tier Limits
 
 | Service | Limit |
 |---------|-------|
 | Gemini 2.5 Flash | 10-15 RPM, 250-1000 RPD |
 | Groq (llama-3.1-8b) | 30 RPM, 14.4K RPD |
 | Web Speech API | Unlimited |
 
 ---
 
 ## Implementation Phases
 
 ### Phase 1: Backend - AI Consultant Service (Day 1)
 
 **Files to create:**
 ```
 backend/src/
 ├── controllers/aiConsultantController.ts
 ├── services/aiConsultantService.ts
 ├── services/productContextService.ts
 └── routes/aiConsultantRoutes.ts
 ```
 
 **Tasks:**
 - [ ] 1.1 Create `aiConsultantService.ts` - Gemini integration with system prompt
 - [ ] 1.2 Create `productContextService.ts` - Query products from DB for context
 - [ ] 1.3 Create `aiConsultantController.ts` - Handle chat requests
 - [ ] 1.4 Create `aiConsultantRoutes.ts` - POST /api/ai-consultant/chat
 - [ ] 1.5 Register routes in server.ts
 - [ ] 1.6 Add rate limiting for AI endpoints
 
 **System Prompt Template:**
 ```
 Bạn là Linh - tư vấn viên thời trang nội y chuyên nghiệp tại [Store Name].
 
 NGUYÊN TẮC:
 1. Luôn lịch sự, tế nhị, chuyên nghiệp
 2. Không bao giờ đề cập đến nội dung không phù hợp
 3. Focus vào sự tự tin, thoải mái, chất lượng sản phẩm
 4. Tư vấn dựa trên số đo và nhu cầu thực tế
 5. Trả lời ngắn gọn, dưới 150 từ
 6. Khi được hỏi về sản phẩm, sử dụng thông tin từ context
 
 CONTEXT SẢN PHẨM: {productContext}
 ```
 
 ---
 
 ### Phase 2: Frontend - Chat UI Components (Day 2)
 
 **Files to create:**
 ```
 frontend/src/
 ├── components/ai-consultant/
 │   ├── ChatWidget.tsx          # Floating button + modal
 │   ├── ChatContainer.tsx       # Main chat container
 │   ├── MessageBubble.tsx       # Single message display
 │   ├── ChatInput.tsx           # Text input + send button
 │   └── QuickActions.tsx        # Suggested prompts
 ├── hooks/
 │   └── useAIConsultant.ts      # Chat state management
 └── services/
     └── ai-consultant-api.ts    # API calls
 ```
 
 **Tasks:**
 - [ ] 2.1 Create `ai-consultant-api.ts` - API service
 - [ ] 2.2 Create `useAIConsultant.ts` - React hook for chat state
 - [ ] 2.3 Create `MessageBubble.tsx` - Message display component
 - [ ] 2.4 Create `ChatInput.tsx` - Input with send button
 - [ ] 2.5 Create `QuickActions.tsx` - Suggested prompts
 - [ ] 2.6 Create `ChatContainer.tsx` - Main chat UI
 - [ ] 2.7 Create `ChatWidget.tsx` - Floating widget
 - [ ] 2.8 Add ChatWidget to RootLayoutClient
 
 ---
 
 ### Phase 3: Frontend - Voice Input (Day 3)
 
 **Files to create:**
 ```
 frontend/src/
 ├── components/ai-consultant/
 │   └── VoiceButton.tsx         # Microphone button
 └── hooks/
     └── useWebSpeechSTT.ts      # Speech-to-Text hook
 ```
 
 **Tasks:**
 - [ ] 3.1 Create `useWebSpeechSTT.ts` - Web Speech API STT hook
 - [ ] 3.2 Create `VoiceButton.tsx` - Mic toggle component
 - [ ] 3.3 Integrate VoiceButton into ChatInput
 - [ ] 3.4 Handle browser compatibility (Chrome/Edge/Safari)
 
 **Web Speech API STT Code:**
 ```typescript
 const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
 const recognition = new SpeechRecognition();
 recognition.lang = 'vi-VN';
 recognition.continuous = false;
 recognition.interimResults = true;
 ```
 
 ---
 
 ### Phase 4: Frontend - Voice Output (Day 4)
 
 **Files to create:**
 ```
 frontend/src/
 ├── components/ai-consultant/
 │   └── SpeakerButton.tsx       # Speaker toggle
 └── hooks/
     └── useWebSpeechTTS.ts      # Text-to-Speech hook
 ```
 
 **Tasks:**
 - [ ] 4.1 Create `useWebSpeechTTS.ts` - Web Speech API TTS hook
 - [ ] 4.2 Create `SpeakerButton.tsx` - Speaker toggle component
 - [ ] 4.3 Auto-speak AI responses when enabled
 - [ ] 4.4 Select Vietnamese female voice
 
 **Web Speech API TTS Code:**
 ```typescript
 const utterance = new SpeechSynthesisUtterance(text);
 utterance.lang = 'vi-VN';
 const voices = speechSynthesis.getVoices();
 const femaleVoice = voices.find(v => 
   v.lang.includes('vi') && v.name.toLowerCase().includes('female')
 );
 if (femaleVoice) utterance.voice = femaleVoice;
 speechSynthesis.speak(utterance);
 ```
 
 ---
 
 ### Phase 5: Product RAG & Context (Day 5-6)
 
 **Tasks:**
 - [ ] 5.1 Enhance `productContextService.ts` with search capabilities
 - [ ] 5.2 Add product recommendations based on user queries
 - [ ] 5.3 Include size recommendations integration
 - [ ] 5.4 Add current promotions/coupons to context
 - [ ] 5.5 Store conversation history in session/localStorage
 
 ---
 
 ### Phase 6: Testing & Polish (Day 7)
 
 **Tasks:**
 - [ ] 6.1 Test all chat flows
 - [ ] 6.2 Test voice input on different browsers
 - [ ] 6.3 Test voice output with Vietnamese voices
 - [ ] 6.4 Mobile responsive testing
 - [ ] 6.5 Error handling & fallbacks
 - [ ] 6.6 Performance optimization
 
 ---
 
 ## API Endpoints
 
 ### POST /api/ai-consultant/chat
 
 **Request:**
 ```json
 {
   "message": "string",
   "sessionId": "string (optional)",
   "context": {
     "currentProductSlug": "string (optional)",
     "userMeasurements": "object (optional)"
   }
 }
 ```
 
 **Response:**
 ```json
 {
   "success": true,
   "data": {
     "message": "string",
     "sessionId": "string",
     "suggestedProducts": ["product objects (optional)"]
   }
 }
 ```
 
 ---
 
 ## UI/UX Design
 
 ### Chat Widget
 - Floating button góc phải dưới
 - Icon: MessageCircle hoặc Bot
 - Pulse animation khi idle
 - Click để mở/đóng chat modal
 
 ### Chat Modal
 - Header: Avatar + Tên "Linh" + Close button
 - Body: Message list với auto-scroll
 - Footer: Input + Voice button + Send button
 - Quick actions: "Tư vấn size", "Sản phẩm hot", "Khuyến mãi"
 
 ### Voice Controls
 - Mic button: Hold to record / Click to toggle
 - Speaker button: Toggle auto-speak responses
 - Visual feedback: Recording indicator, speaking indicator
 
 ---
 
 ## Security Considerations
 
 - Rate limiting: 20 requests/minute per IP
 - Input sanitization: Filter inappropriate content
 - Output sanitization: DOMPurify for HTML
 - No PII logging in AI conversations
 - Session-based conversation (no permanent storage by default)
 
 ---
 
 ## Progress Tracking
 
 | Phase | Status | Completion |
| Phase | Status | Completion | Notes |
|-------|--------|------------|-------|
| Phase 1: Backend | ✅ Done | 100% | aiConsultantService, Controller, Routes created |
| Phase 2: Chat UI | ✅ Done | 100% | ChatWidget, MessageBubble, ChatInput, QuickActions |
| Phase 3: Voice Input | ✅ Done | 100% | useWebSpeechSTT, VoiceButton (Vietnamese) |
| Phase 4: Voice Output | ✅ Done | 100% | useWebSpeechTTS, SpeakerButton (Female voice) |
| Phase 5: RAG & Context | ⏳ Pending | 0% | Product search in AI responses |
| Phase 6: Testing | ⏳ Pending | 0% | Browser compatibility testing |
 ---
 
 ## Notes
 
 - Project đã có Gemini API setup (`@google/generative-ai`)
 - Đã có `geminiService.ts` trong dashboard
 - Sử dụng Tailwind CSS cho styling
 - Backend dùng Express + Prisma
