export type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_CHAT_MODEL?: string;
  GEMINI_LIVE_MODEL?: string;
  /** "false" closes the AI routes; they are open for testing otherwise (no accounts yet). */
  OPEN_AI_PREVIEW?: string;
  /** The person's LifeOS Supabase project and its publishable key (public by design); the
   * browser signs in there with the person's own account. Unset: no rooms from LifeOS. */
  LIFEOS_SUPABASE_URL?: string;
  LIFEOS_SUPABASE_PUBLISHABLE_KEY?: string;
};
