"use client";

import { useEffect, useRef } from "react";
import Chart, { type ChartConfiguration, type ScriptableContext } from "chart.js/auto";

const GRID = "rgba(120,138,128,0.15)";
const TICK = "#7a887f";
const FONT = { family: "Geist, system-ui, sans-serif", size: 12 };

function useChart(config: () => ChartConfiguration, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(ctx, config());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const baseScales = {
  y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { font: FONT, color: TICK, callback: (v: string | number) => (Number(v) >= 1000 ? `${Number(v) / 1000}k` : `${v}`) } },
  x: { grid: { display: false }, border: { display: false }, ticks: { font: FONT, color: TICK } },
};
const tooltip = { backgroundColor: "#161d19", titleFont: FONT, bodyFont: { ...FONT, weight: "bold" as const }, padding: 10, displayColors: true };

/** Grouped bars — revenue vs expense. */
export function RevenueExpenseBars({ labels, income, expense }: { labels: string[]; income: number[]; expense: number[] }) {
  const ref = useChart(
    () => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Income", data: income, backgroundColor: "#0b7a52", borderRadius: 5, maxBarThickness: 26 },
          { label: "Expense", data: expense, backgroundColor: "#e5a05a", borderRadius: 5, maxBarThickness: 26 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { font: FONT, color: TICK, usePointStyle: true, boxWidth: 8 } }, tooltip },
        scales: baseScales,
      },
    }),
    [labels, income, expense],
  );
  return <canvas ref={ref} />;
}

/** Area line — a single trend series. */
export function TrendLine({ labels, values, color = "#0b7a52", label = "Value" }: { labels: string[]; values: number[]; color?: string; label?: string }) {
  const ref = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [{
          label, data: values, borderColor: color, backgroundColor: (c: ScriptableContext<"line">) => {
            const { ctx, chartArea } = c.chart;
            if (!chartArea) return "transparent";
            const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, `${color}55`); g.addColorStop(1, `${color}00`);
            return g;
          },
          borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#fff", pointBorderColor: color, pointBorderWidth: 2,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip }, scales: baseScales, interaction: { intersect: false, mode: "index" } },
    }),
    [labels, values, color, label],
  );
  return <canvas ref={ref} />;
}

/** Doughnut — category breakdown. */
export function Donut({ labels, values, colors }: { labels: string[]; values: number[]; colors?: string[] }) {
  const palette = colors ?? ["#0b7a52", "#1f6f8b", "#e5a05a", "#8a5cf6", "#c05c6d", "#cfd8d1"];
  const ref = useChart(
    () => ({
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => ` ${c.label}: ${Number(c.parsed).toLocaleString()}` } } } },
    }),
    [labels, values],
  );
  return <canvas ref={ref} />;
}
