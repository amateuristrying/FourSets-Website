const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** One ground plane for both the scenery and the runner's square source frames. */
export function landscapeLayout(width: number, height: number) {
  const groundY = Math.max(1, height - clamp(height * .075, 22, 38));
  const size = Math.min(groundY * .84, width * .88);
  return { groundY, size, left: (width - size) / 2, top: groundY - size };
}

/** Wrap fully outside the viewport, so a cloud never teleports in view. */
export function landscapeX(start: number, speed: number, seconds: number, span: number) {
  return ((start - speed * seconds) % span + span) % span;
}

// Stepped, unfilled cloud outline, drawn in a small pixel-art coordinate grid.
const CLOUD = [
  [0, 20], [3, 20], [3, 17], [9, 17], [9, 15], [15, 15],
  [15, 12], [19, 12], [19, 8], [24, 8], [24, 5], [30, 5],
  [30, 2], [36, 2], [36, 4], [41, 4], [41, 7], [45, 7],
  [45, 11], [49, 11], [49, 13], [56, 13], [56, 16],
  [61, 16], [61, 20], [64, 20], [64, 22], [6, 22],
] as const;

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, opacity: number) {
  const scale = width / 64;
  ctx.strokeStyle = `rgba(232,255,107,${opacity})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  CLOUD.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(x + px * scale, y + py * scale);
    else ctx.lineTo(x + px * scale, y + py * scale);
  });
  // A pair of detached pixels gives the cloud the same broken contour as the reference.
  ctx.moveTo(x - 8 * scale, y + 22 * scale);
  ctx.lineTo(x - 5 * scale, y + 22 * scale);
  ctx.moveTo(x - 4 * scale, y + 19 * scale);
  ctx.lineTo(x - 2 * scale, y + 19 * scale);
  ctx.stroke();
}

/** Endless terrain moving left; the distant sky moves more slowly in parallax. */
export function drawLandscape(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number) {
  ctx.clearRect(0, 0, width, height);
  const { groundY, size } = landscapeLayout(width, height);
  const cloudWidth = clamp(width * .1, 62, 150);
  const cloudMargin = cloudWidth * 1.35;
  const cloudSpan = width + cloudMargin * 2;
  const groundSpeed = size * .72;

  // On narrow phones use two clouds, leaving more black sky around the athlete.
  const clouds = width < 600
    ? [{ x: .15, y: .28, scale: .8, speed: .055 }, { x: .82, y: .13, scale: 1, speed: .038 }]
    : [{ x: .18, y: .38, scale: .9, speed: .05 }, { x: .7, y: .25, scale: 1.15, speed: .036 },
      { x: .9, y: .48, scale: .65, speed: .065 }];

  for (const item of clouds) {
    const x = landscapeX(item.x * width + cloudMargin, groundSpeed * item.speed, seconds, cloudSpan) - cloudMargin;
    cloud(ctx, x, groundY * item.y, cloudWidth * item.scale, .8);
  }

  ctx.fillStyle = '#E8FF6B';
  ctx.fillRect(0, Math.round(groundY), width, 2);
  // Repeat a deterministic pattern in world space. The tile length is an exact
  // multiple of the spacing, so wrapping has no seam or reset flash.
  const tileWidth = 336;
  const shift = landscapeX(0, groundSpeed, seconds, tileWidth);
  ctx.fillStyle = 'rgba(232,255,107,.88)';
  for (let tile = -1; tile <= Math.ceil(width / tileWidth); tile++) {
    for (let i = 0; i < 12; i++) {
      const x = tile * tileWidth + shift + i * 28 + (i * 17 % 13);
      const y = groundY + 9 + (i * 7 % 15);
      ctx.fillRect(x, Math.round(y), i % 3 === 0 ? 5 : 3, i % 4 === 0 ? 2 : 1.5);
    }
  }
}
