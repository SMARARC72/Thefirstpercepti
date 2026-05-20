import type { MapPoint } from "../game";

interface MapCanvasProps {
  points: MapPoint[];
  width?: number;
  height?: number;
}

export class MapCanvas {
  private props: Required<MapCanvasProps>;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;

  constructor(props: MapCanvasProps) {
    this.props = {
      points: props.points,
      width: props.width ?? 640,
      height: props.height ?? 380,
    };
  }

  render(): HTMLCanvasElement {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "map-canvas";
    this.canvas.width = this.props.width;
    this.canvas.height = this.props.height;
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "Perception map showing nearby points of interest");
    this.ctx = this.canvas.getContext("2d");
    this.draw();
    return this.canvas;
  }

  update(newProps: Partial<MapCanvasProps>): void {
    if (newProps.points !== undefined) this.props.points = newProps.points;
    this.draw();
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const width = this.props.width;
    const height = this.props.height;

    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0b0d13");
    gradient.addColorStop(0.52, "#111420");
    gradient.addColorStop(1, "#091113");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = "rgba(137, 178, 178, 0.15)";
    this.ctx.lineWidth = 1;
    for (let x = 80; x < width; x += 80) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 76; y < height; y += 76) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    for (const point of this.props.points) {
      this.drawPoint(point, width, height);
    }
  }

  private drawPoint(point: MapPoint, width: number, height: number): void {
    if (!this.ctx) return;
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;
    const colorByKind: Record<string, string> = {
      player: "#f5d982",
      anomaly: "#66e0c2",
      npc: "#9fb7ff",
      hazard: "#ff6b6b",
      sanctuary: "#7dd87d",
      exit: "#c9a0dc",
      poi: "#66e0c2",
    };
    const color = colorByKind[point.kind];

    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = point.kind === "player" ? 18 : 10;
    this.ctx.beginPath();
    this.ctx.arc(x, y, point.kind === "player" ? 8 : 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.font = "13px \"EB Garamond\", Garamond, serif";
    this.ctx.fillStyle = "rgba(241, 238, 225, 0.82)";
    this.ctx.fillText(point.label, x + 12, y + 4);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas = null;
    this.ctx = null;
  }
}
