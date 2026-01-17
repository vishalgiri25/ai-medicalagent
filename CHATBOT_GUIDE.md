# Chatbot Implementation Guide

## Overview

A text-based chatbot has been successfully integrated into your AI Medical Agent application. Users can now choose between **Voice Mode** and **Text Chat Mode** when consulting with medical specialists.

## What's New

### 1. **ChatBot Component** (`components/ChatBot.tsx`)

A reusable, modern chat interface featuring:

- Real-time message display with user/assistant distinction
- Auto-scrolling to latest messages
- Typing indicators while AI responds
- Auto-resizing text input
- Timestamp display
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### 2. **Chat API Endpoint** (`app/api/chat-message/route.ts`)

Handles text-based conversations:

- **POST**: Sends messages and receives AI responses
- **GET**: Retrieves conversation history
- Integrates with OpenAI GPT-4o-mini
- Saves conversation to database
- Enforces user authentication and session ownership
- Uses doctor-specific system prompts

### 3. **Enhanced Medical Agent Page**

The medical consultation page now includes:

- **Mode Toggle**: Switch between Voice and Text chat modes
- **Persistent Conversations**: Chat history is saved and reloaded
- **Seamless Integration**: Works alongside existing voice features
- **Lab Reports**: Both modes support uploading and viewing lab reports

## Features

### Text Chat Mode

- **AI-Powered Responses**: Uses GPT-4o-mini for intelligent medical assistance
- **Context-Aware**: Maintains conversation history for continuity
- **Doctor Personas**: Different specialists have tailored system prompts
- **Medical Knowledge**: Provides helpful medical information while recommending professional care
- **Empathetic Responses**: Professional, compassionate communication style

### User Experience

- **Flexible Communication**: Choose voice or text based on preference
- **No Call Required**: Get medical guidance without making a call
- **Faster Responses**: Text chat often provides quicker answers
- **Review History**: Easily scroll back through conversation
- **Accessibility**: Better for users in quiet environments or with hearing considerations

## How It Works

### For Users:

1. Navigate to a medical consultation session
2. Click the **"Chat"** button to switch to text mode
3. Type your medical questions or symptoms
4. Press Enter to send (Shift+Enter for new line)
5. Receive AI-powered medical guidance
6. Switch back to **"Voice"** mode anytime

### Technical Flow:

1. User types message in `ChatBot` component
2. Message sent to `/api/chat-message` endpoint
3. API validates user authentication and session ownership
4. OpenAI processes message with doctor-specific context
5. Response saved to database and returned to user
6. UI updates with AI response
7. Conversation persists for future sessions

## Database Schema

The existing `SessionChatTable` already supports text conversations through the `conversation` JSON field, which stores:

```json
{
  "role": "user" | "assistant",
  "content": "message text",
  "timestamp": "ISO date string"
}
```

## API Endpoints

### POST /api/chat-message

Send a message and receive AI response

```typescript
Request: {
  sessionId: string,
  message: string,
  messages?: Message[],  // conversation history
  systemPrompt?: string  // optional custom prompt
}

Response: {
  message: string,
  success: boolean
}
```

### GET /api/chat-message?sessionId={id}

Retrieve conversation history

```typescript
Response: {
  conversation: Message[],
  success: boolean
}
```

## Customization

### System Prompts

Edit the default prompt in [route.ts](app/api/chat-message/route.ts#L50-L66) to change AI behavior:

- Medical expertise level
- Communication style
- Recommendation guidelines
- Safety warnings

### UI Styling

Customize the chat interface in [ChatBot.tsx](components/ChatBot.tsx):

- Message bubble colors
- Layout spacing
- Animation effects
- Input field style

### Toggle Position

Adjust mode toggle placement in [page.tsx](<app/(routes)/dashboard/medical-agent/[sessionId]/page.tsx#L313-L328>)

## Security Features

- ✅ User authentication required
- ✅ Session ownership verification
- ✅ Input sanitization
- ✅ Error handling
- ✅ Rate limiting (via consultation limits)

## Future Enhancements

Consider adding:

- Message reactions/feedback
- Export conversation as PDF
- Voice-to-text integration
- Multi-language support
- Rich media messages (images, files)
- Suggested quick replies
- Typing indicators for better UX

## Testing

1. Start development server: `npm run dev`
2. Sign in to your account
3. Create or open a consultation session
4. Click "Chat" toggle button
5. Send test messages
6. Verify responses are appropriate
7. Check conversation saves correctly
8. Test switching between voice and text modes

## Troubleshooting

**Chat not loading?**

- Check OpenAI API key in environment variables
- Verify database connection
- Check browser console for errors

**Messages not saving?**

- Verify `conversation` field in database schema
- Check API logs for errors
- Ensure user has proper permissions

**AI responses inappropriate?**

- Review and adjust system prompt
- Modify temperature parameter
- Update model selection

## Support

For issues or questions, check:

- Console logs for error messages
- Network tab for API failures
- Database for saved conversations
- OpenAI dashboard for API usage

---

**Congratulations!** Your medical AI agent now supports both voice and text-based consultations, providing users with flexible, accessible healthcare guidance.
