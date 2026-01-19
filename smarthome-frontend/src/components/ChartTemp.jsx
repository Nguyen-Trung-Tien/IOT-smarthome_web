import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function ChartTemp() {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        tension: 0.3,
        fill: true, 
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  });

  const [status, setStatus] = useState("Đang kết nối...");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/sensors");
        const data = await res.json();

        setStatus("Đã kết nối");

        setChartData((prev) => {
          const now = new Date().toLocaleTimeString();

          return {
            labels: [...prev.labels, now].slice(-50),
            datasets: [
              {
                ...prev.datasets[0],
                data: [...prev.datasets[0].data, data.temp].slice(-50),
              },
            ],
          };
        });
      } catch (err) {
        console.log(err);
        setStatus("Mất kết nối");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `Nhiệt độ: ${ctx.raw} °C`,
        },
      },
      title: {
        display: true,
        text: "Nhiệt độ theo thời gian (Realtime)",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 50,
        title: {
          display: true,
          text: "°C",
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="card p-3 mb-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>🌡 Temperature Chart</h5>
        <span className="small text-muted">{status}</span>
      </div>

      <div style={{ height: "300px" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
