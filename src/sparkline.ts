/**
 * Lightweight inline sparkline renderer.
 * Maintains a rolling buffer of samples and renders as an inline SVG polyline.
 */

const MAX_SAMPLES = 60; // 60 ticks = 60 seconds of history

export class Sparkline {
  private samples: number[] = [];
  private min = 0;
  private max = 1;
  private polyline: SVGPolylineElement | null = null;

  constructor(private width = 80, private height = 20) {}

  /** Bind to an existing SVG element in the DOM. */
  bind(svg: Element): void {
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

    this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    this.polyline.setAttribute('fill', 'none');
    this.polyline.setAttribute('stroke', 'currentColor');
    this.polyline.setAttribute('stroke-width', '1.5');
    this.polyline.setAttribute('stroke-linecap', 'round');
    this.polyline.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(this.polyline);
  }

  /** Push a new sample and re-render. */
  push(value: number): void {
    this.samples.push(value);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    this.render();
  }

  /** Clear all samples. */
  reset(): void {
    this.samples.length = 0;
    if (this.polyline) this.polyline.setAttribute('points', '');
  }

  private render(): void {
    if (!this.polyline || this.samples.length < 2) return;

    this.min = Math.min(...this.samples);
    this.max = Math.max(...this.samples);
    const range = this.max - this.min || 1;
    const pad = 1; // 1px padding top/bottom

    const points = this.samples.map((v, i) => {
      const x = (i / (this.samples.length - 1)) * this.width;
      const y = pad + (1 - (v - this.min) / range) * (this.height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    this.polyline.setAttribute('points', points);
  }
}
