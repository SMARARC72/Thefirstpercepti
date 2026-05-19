interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ParticleCanvasProps {
  density?: number; // particles per 100x100 px
  mode?: "ash" | "motes" | "fog";
}

export class ParticleCanvas {
  private props: Required<ParticleCanvasProps>;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor(props: ParticleCanvasProps = {}) {
    this.props = {
      density: props.density ?? 4,
      mode: props.mode ?? "ash",
    };
  }

  render(): HTMLCanvasElement {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "particle-canvas";
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    this.initParticles();
    this.animate();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) {
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      // Observe when attached
      queueMicrotask(() => {
        if (this.canvas?.parentElement) this.resizeObserver?.observe(this.canvas.parentElement);
      });
    }

    return this.canvas;
  }

  private resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() ?? { width: 0, height: 0 };
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx?.scale(dpr, dpr);
    this.initParticles();
  }

  private initParticles(): void {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() ?? { width: 0, height: 0 };
    const count = Math.max(20, Math.floor((rect.width * rect.height) / 25000) * this.props.density);
    this.particles = [];

    const palettes: Record<string, string[]> = {
      ash: ["rgba(160,170,180,", "rgba(140,150,160,", "rgba(180,190,200,"],
      motes: ["rgba(102,224,194,", "rgba(245,217,130,", "rgba(159,183,255,"],
      fog: ["rgba(100,110,130,", "rgba(90,100,120,", "rgba(110,120,140,"],
    };
    const palette = palettes[this.props.mode];

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(rect.width, rect.height, palette));
    }
  }

  private createParticle(w: number, h: number, palette: string[]): Particle {
    const color = palette[Math.floor(Math.random() * palette.length)];
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * (this.props.mode === "fog" ? 0.3 : 0.6),
      vy: this.props.mode === "ash" ? Math.random() * 0.4 + 0.1 : (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      life: Math.random() * 1000,
      maxLife: 1000 + Math.random() * 2000,
      color,
    };
  }

  private animate = (): void => {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() ?? { width: 0, height: 0 };
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * (1 - Math.abs(lifeRatio - 0.5) * 2);

      if (p.life >= p.maxLife || p.x < -10 || p.x > rect.width + 10 || p.y < -10 || p.y > rect.height + 10) {
        const palette = [
          "rgba(160,170,180,",
          "rgba(140,150,160,",
          "rgba(180,190,200,",
        ];
        Object.assign(p, this.createParticle(rect.width, rect.height, palette));
        p.y = this.props.mode === "ash" ? -5 : Math.random() * rect.height;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color}${Math.max(0, alpha)})`;
      this.ctx.fill();
    }

    this.rafId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.canvas = null;
    this.ctx = null;
  }
}
