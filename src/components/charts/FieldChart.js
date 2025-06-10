"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const FieldChart = ({ field }) => {
  if (!field.statistics?.chartData) {
    return null;
  }

  const { chartData } = field.statistics;

  const pieColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#E7E9ED",
    "#71B37C",
    "#FFA726",
    "#AB47BC",
  ];

  const barColors = [
    "rgba(54, 162, 235, 0.8)",
    "rgba(255, 99, 132, 0.8)",
    "rgba(255, 205, 86, 0.8)",
    "rgba(75, 192, 192, 0.8)",
    "rgba(153, 102, 255, 0.8)",
    "rgba(255, 159, 64, 0.8)",
  ];

  const getChartConfig = () => {
    const baseConfig = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 10,
            usePointStyle: true,
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
        },
      },
    };

    if (chartData.type === "pie") {
      return {
        ...baseConfig,
        plugins: {
          ...baseConfig.plugins,
          tooltip: {
            ...baseConfig.plugins.tooltip,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
      };
    }

    if (chartData.type === "bar" || chartData.type === "histogram") {
      return {
        ...baseConfig,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      };
    }

    return baseConfig;
  };

  const getChartData = () => {
    if (chartData.type === "pie") {
      return {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.data,
            backgroundColor: pieColors.slice(0, chartData.labels.length),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      };
    }

    if (chartData.type === "bar" || chartData.type === "histogram") {
      return {
        labels: chartData.labels,
        datasets: [
          {
            label: chartData.type === "histogram" ? "تعداد" : "انتخاب شده",
            data: chartData.data,
            backgroundColor: barColors.slice(0, chartData.labels.length),
            borderColor: barColors
              .slice(0, chartData.labels.length)
              .map((color) => color.replace("0.8", "1")),
            borderWidth: 1,
          },
        ],
      };
    }

    return { labels: [], datasets: [] };
  };

  const renderPieChart = () => {
    const total = chartData.data.reduce((a, b) => a + b, 0);

    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-500">
          هیچ داده‌ای برای نمایش وجود ندارد
        </div>
      );
    }

    let currentAngle = 0;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="200" height="200" className="mb-4">
            {chartData.data.map((value, index) => {
              if (value === 0) return null;

              const percentage = (value / total) * 100;
              const angle = (value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;

              const x1 =
                100 + 80 * Math.cos(((startAngle - 90) * Math.PI) / 180);
              const y1 =
                100 + 80 * Math.sin(((startAngle - 90) * Math.PI) / 180);
              const x2 = 100 + 80 * Math.cos(((endAngle - 90) * Math.PI) / 180);
              const y2 = 100 + 80 * Math.sin(((endAngle - 90) * Math.PI) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                "Z",
              ].join(" ");

              currentAngle += angle;

              return (
                <g key={index}>
                  <path
                    d={pathData}
                    fill={pieColors[index % pieColors.length]}
                    stroke="#fff"
                    strokeWidth="2"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                  {percentage > 8 && (
                    <text
                      x={
                        100 +
                        50 *
                          Math.cos(
                            (((startAngle + endAngle) / 2 - 90) * Math.PI) / 180
                          )
                      }
                      y={
                        100 +
                        50 *
                          Math.sin(
                            (((startAngle + endAngle) / 2 - 90) * Math.PI) / 180
                          )
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-white font-medium pointer-events-none"
                    >
                      {percentage.toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">{total}</div>
              <div className="text-xs text-gray-500">کل پاسخ</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs w-full max-w-xs">
          {chartData.labels.map((label, index) => {
            if (chartData.data[index] === 0) return null;
            const percentage = ((chartData.data[index] / total) * 100).toFixed(
              1
            );
            return (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full ml-2 flex-shrink-0"
                    style={{
                      backgroundColor: pieColors[index % pieColors.length],
                    }}
                  ></div>
                  <span className="truncate">{label}</span>
                </div>
                <div className="text-left flex-shrink-0">
                  <span className="font-medium">{chartData.data[index]}</span>
                  <span className="text-gray-500 mr-1">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...chartData.data);
    const total = chartData.data.reduce((a, b) => a + b, 0);

    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-500">
          هیچ داده‌ای برای نمایش وجود ندارد
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {chartData.labels.map((label, index) => {
          const value = chartData.data[index];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const totalPercentage =
            total > 0 ? ((value / total) * 100).toFixed(1) : 0;

          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate font-medium">{label}</span>
                <span className="flex-shrink-0">
                  {value} ({totalPercentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                >
                  {percentage > 15 && (
                    <span className="text-white text-xs font-medium">
                      {value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHistogram = () => {
    const maxValue = Math.max(...chartData.data);
    const total = chartData.data.reduce((a, b) => a + b, 0);

    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-500">
          هیچ داده‌ای برای نمایش وجود ندارد
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          className="grid gap-1 h-40"
          style={{
            gridTemplateColumns: `repeat(${chartData.data.length}, 1fr)`,
          }}
        >
          {chartData.data.map((value, index) => {
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div
                key={index}
                className="flex flex-col justify-end items-center"
              >
                <div className="text-xs mb-1 font-medium text-gray-700">
                  {value > 0 ? value : ""}
                </div>
                <div
                  className="bg-gradient-to-t from-green-500 to-green-400 w-full rounded-t transition-all duration-500 min-h-[4px]"
                  style={{ height: `${Math.max(height, value > 0 ? 8 : 0)}%` }}
                  title={`${chartData.labels[index]}: ${value}`}
                ></div>
              </div>
            );
          })}
        </div>
        <div
          className="grid gap-1 text-xs text-center"
          style={{
            gridTemplateColumns: `repeat(${chartData.data.length}, 1fr)`,
          }}
        >
          {chartData.labels.map((label, index) => (
            <div key={index} className="truncate text-gray-600" title={label}>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (chartData.type === "histogram" && chartData.stats) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="font-medium text-blue-800">میانگین</div>
            <div className="text-lg font-bold text-blue-900">
              {chartData.stats.average}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="font-medium text-green-800">میانه</div>
            <div className="text-lg font-bold text-green-900">
              {chartData.stats.median}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="font-medium text-orange-800">حداقل</div>
            <div className="text-lg font-bold text-orange-900">
              {chartData.stats.min}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="font-medium text-red-800">حداکثر</div>
            <div className="text-lg font-bold text-red-900">
              {chartData.stats.max}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h5 className="font-semibold text-base mb-2 text-gray-800">
          {field.label}
        </h5>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="bg-gray-100 px-2 py-1 rounded">
            نوع: <span className="font-medium">{field.type}</span>
          </span>
          <span className="bg-blue-100 px-2 py-1 rounded">
            پاسخ:{" "}
            <span className="font-medium">
              {field.statistics.totalResponses}
            </span>
          </span>
          <span className="bg-green-100 px-2 py-1 rounded">
            درصد:{" "}
            <span className="font-medium">
              {field.statistics.responseRate}%
            </span>
          </span>
        </div>
      </div>

      <div className="mb-4">
        {chartData.type === "pie" && renderPieChart()}
        {chartData.type === "bar" && renderBarChart()}
        {chartData.type === "histogram" && renderHistogram()}
      </div>

      {renderStats()}

      {field.statistics.optionCounts && chartData.type !== "histogram" && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">
            خلاصه آماری:
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(field.statistics.optionCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([option, count]) => {
                const total = Object.values(
                  field.statistics.optionCounts
                ).reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                return (
                  <div
                    key={option}
                    className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded"
                  >
                    <span className="truncate flex-1 font-medium">
                      {option}
                    </span>
                    <span className="bg-white px-2 py-1 rounded ml-2 text-gray-700">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldChart;
