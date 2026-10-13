/** States plainly when the AI is closed, so nothing looks like it works when it cannot. */
export function AiNotice({ ai }: { ai: boolean | null }) {
  if (ai !== false) return null;
  return (
    <p className="notice" role="status">
      Characters are not live on this deployment yet. Rooms and their panels still work; talking to
      a character needs the AI preview to be enabled.
    </p>
  );
}
