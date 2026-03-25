// Trillingseffect bij afvinken van een taak
// navigator.vibrate() werkt op Android Chrome PWA
// iOS Safari ondersteunt de Vibration API niet — geluid + animatie zijn daar de feedback

export function hapticComplete() {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(40);
  } catch {
    // Niet beschikbaar — geen probleem
  }
}
