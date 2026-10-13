export type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_CHAT_MODEL?: string;
  /** "true" opens the AI routes without accounts; only for a guarded preview deployment. */
  OPEN_AI_PREVIEW?: string;
};
