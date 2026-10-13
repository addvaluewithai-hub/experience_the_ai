export type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_CHAT_MODEL?: string;
  GEMINI_LIVE_MODEL?: string;
  /** "false" closes the AI routes; they are open for testing otherwise (no accounts yet). */
  OPEN_AI_PREVIEW?: string;
};
