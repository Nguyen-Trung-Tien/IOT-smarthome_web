import { useEffect, useState } from "react";

export default function Header() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleString("vi-VN"));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-dark text-white p-3 rounded shadow-sm mb-3">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <h3 className="mb-0">🏠 Smart Home</h3>
          <span className="badge bg-success">ONLINE</span>
        </div>

        <div className="text-end">
          <div className="small text-light">Realtime Dashboard</div>
          <div className="small text-muted">{time}</div>
        </div>
      </div>
    </div>
  );
}
