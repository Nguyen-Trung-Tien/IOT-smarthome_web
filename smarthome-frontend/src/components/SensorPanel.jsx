import { useEffect, useState } from "react";

const SensorCard = ({ icon, label, value, unit, color = "primary" }) => (
  <div className="col-md-3 mb-3">
    <div className={`card border-${color} shadow-sm h-100`}>
      <div className="card-body">
        <h6 className="text-muted">
          {icon} {label}
        </h6>
        <h4 className={`text-${color} mb-0`}>
          {value} {unit}
        </h4>
      </div>
    </div>
  </div>
);

export default function SensorPanel() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Đang kết nối...");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/sensors");
        const json = await res.json();
        setData(json);
        setStatus("ONLINE");
      } catch (err) {
        console.log(err);
        setStatus("OFFLINE");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!data)
    return (
      <div className="card p-3 mb-3 text-center text-muted">
        ⏳ Đang tải dữ liệu cảm biến...
      </div>
    );

  return (
    <div className="card p-3 mb-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>📊 Sensor Dashboard</h5>
        <span
          className={`badge ${
            status === "ONLINE" ? "bg-success" : "bg-danger"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="row">
        <SensorCard
          icon="🌡"
          label="Nhiệt độ"
          value={data.temp}
          unit="°C"
          color="danger"
        />
        <SensorCard
          icon="💧"
          label="Độ ẩm"
          value={data.hum}
          unit="%"
          color="info"
        />
        <SensorCard
          icon="💡"
          label="Ánh sáng"
          value={data.light}
          unit=""
          color="warning"
        />
        <SensorCard
          icon="🧯"
          label="Khí gas"
          value={data.gas}
          unit=""
          color="secondary"
        />
        <SensorCard
          icon="🌊"
          label="Mực nước"
          value={data.water}
          unit=""
          color="primary"
        />
        <SensorCard
          icon="🚪"
          label="Cửa"
          value={data.door}
          unit=""
          color="success"
        />
        <SensorCard
          icon="⚙"
          label="Chế độ"
          value={data.mode}
          unit=""
          color="dark"
        />
      </div>
    </div>
  );
}
