import React, { useEffect, useRef } from 'react';

export default function ChartCanvas({ type = 'bar', labels = [], datasets = [], options = {}, height = 260 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const Chart = window.Chart;
    if (!Chart || !canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: type === 'doughnut' ? 'bottom' : 'top',
            labels: {
              font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 12 },
            },
          },
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, JSON.stringify(labels), JSON.stringify(datasets), JSON.stringify(options)]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
