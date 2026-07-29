/**
 * Split out from youtube.ts (which imports Node's child_process) so this
 * constant can be imported by client components too -- shown to the user
 * as a checkbox and stored verbatim in consent_attestations.statement_text,
 * the exact same string on both sides, so the recorded attestation always
 * matches what was actually shown, not a paraphrase of it.
 */
export const YOUTUBE_RIGHTS_STATEMENT =
  "I confirm I own this video, have explicit permission to use it, or am using it under fair use, and that importing it doesn't infringe anyone's rights.";
