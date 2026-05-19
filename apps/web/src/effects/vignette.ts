/**
 * Vignette update helper.
 */
export function updateVignette(danger: number): void {
  const intensity = Math.max(0, Math.min(1, danger / 100));
  const spread = 20 + intensity * 60;
  const darkness = 0.3 + intensity * 0.5;
  const redTint = Math.round(intensity * 80);
  document.body.style.boxShadow = `inset 0 0 ${spread}vmin rgba(${redTint}, 0, 0, ${darkness})`;
}
