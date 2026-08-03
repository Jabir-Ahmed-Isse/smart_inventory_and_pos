"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

/** Area line chart bound to live daily revenue for the last 7 days. */
export function RevenueChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(0, 108, 73, 0.5)");
    gradient.addColorStop(1, "rgba(0, 108, 73, 0.0)");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Revenue ($)",
            data: values,
            borderColor: "#006c49",
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#006c49",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#161d19",
            titleFont: { family: "Inter", size: 12 },
            bodyFont: { family: "Inter", size: 14, weight: "bold" },
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => "$" + (context.parsed.y ?? 0).toLocaleString(),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#e8f0e9" },
            border: { display: false },
            ticks: {
              font: { family: "Geist", size: 12 },
              color: "#6c7a71",
              callback: (value) => {
                const v = Number(value);
                return v >= 1000 ? "$" + v / 1000 + "k" : "$" + v;
              },
            },
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: "Geist", size: 12 }, color: "#6c7a71" },
          },
        },
        interaction: { intersect: false, mode: "index" },
      },
    });

    return () => chart.destroy();
  }, [labels, values]);

  return <canvas ref={canvasRef} />;
}
