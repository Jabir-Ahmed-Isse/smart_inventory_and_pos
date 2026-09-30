"use client";

import { useEffect, useRef } from "react";

/** Doughnut chart bound to live inventory units per category. */
export function InventoryDonut({
  labels,
  values,
  colors,
}: {
  labels: string[];
  values: number[];
  colors: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const total = values.reduce((s, v) => s + v, 0) || 1;

    // chart.js is loaded lazily so it stays out of the dashboard's First Load JS.
    let chart: { destroy: () => void } | null = null;
    let cancelled = false;
    void (async () => {
      const { default: Chart } = await import("chart.js/auto");
      if (cancelled) return;
      chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#161d19",
            bodyFont: { family: "Inter", size: 14 },
            callbacks: {
              label: (context) => {
                const v = Number(context.parsed) || 0;
                const pct = Math.round((v / total) * 100);
                return ` ${context.label}: ${v.toLocaleString()} units (${pct}%)`;
              },
            },
          },
        },
      },
      });
    })();

    return () => { cancelled = true; chart?.destroy(); };
  }, [labels, values, colors]);

  return <canvas ref={canvasRef} />;
}
