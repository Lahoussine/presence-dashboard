import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "oklch(0.5 0.02 255)", font: { size: 11 }, boxWidth: 12 },
    },
    tooltip: {
      backgroundColor: "oklch(1 0 0)",
      titleColor: "oklch(0.18 0.03 250)",
      bodyColor: "oklch(0.18 0.03 250)",
      borderColor: "oklch(0.92 0.01 250)",
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: "oklch(0.92 0.01 250)", display: false },
      ticks: { color: "oklch(0.5 0.02 255)", font: { size: 11 } },
    },
    y: {
      grid: { color: "oklch(0.92 0.01 250)" },
      ticks: { color: "oklch(0.5 0.02 255)", font: { size: 11 } },
      beginAtZero: true,
    },
  },
} as const;
