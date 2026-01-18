import { useState, useEffect } from "react";
import axios from "axios";

export default function SchedulePanel() {
  const [device, setDevice] = useState("LIGHT");
  const [action, setAction] = useState("ON");
  const [time, setTime] = useState("18:00");
  const [repeat, setRepeat] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const API = "http://localhost:3000";

  const loadSchedules = async () => {
    try {
      const res = await axios.get(API + "/api/schedule");
      setSchedules(res.data);
    } catch (err) {
      console.log(err);
      setMessage("Lỗi tải lịch hẹn");
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const addSchedule = async () => {
    try {
      setLoading(true);
      setMessage("⏳ Đang thêm lịch...");

      await axios.post(API + "/api/schedule", {
        device,
        action,
        schedule_time: time + ":00",
        repeat_daily: repeat ? 1 : 0,
        active: 1,
      });

      setMessage("Thêm lịch thành công!");
      loadSchedules();
    } catch (err) {
      console.log(err);
      setMessage("Lỗi khi thêm lịch");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lịch này?")) return;

    try {
      await axios.delete(API + "/api/schedule/" + id);
      setMessage("🗑️ Đã xóa lịch");
      loadSchedules();
    } catch (err) {
      console.log(err);
      setMessage("❌ Không thể xóa lịch");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const formatTime = (t) => t?.slice(0, 5);

  const deviceLabel = {
    LIGHT: "💡 Đèn",
    FAN: "🌀 Quạt",
    AC: "❄️ Điều hòa",
    PUMP: "🚰 Máy bơm",
  };

  const actionBadge = (a) =>
    a === "ON" ? (
      <span className="badge bg-success">BẬT</span>
    ) : (
      <span className="badge bg-secondary">TẮT</span>
    );

  return (
    <div className="card p-3 shadow-sm border-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 fw-bold">⏰ HẸN GIỜ TỰ ĐỘNG</h6>
        {message && (
          <span className="small text-primary fw-semibold">{message}</span>
        )}
      </div>

      {/* FORM TẠO LỊCH */}
      <div className="row g-2 mb-3">
        <div className="col-6">
          <label className="form-label small text-muted">Thiết bị</label>
          <select
            className="form-select form-select-sm"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            <option value="LIGHT">💡 Đèn</option>
            <option value="FAN">🌀 Quạt</option>
            <option value="AC">❄️ Điều hòa</option>
            <option value="PUMP">🚰 Máy bơm</option>
          </select>
        </div>

        <div className="col-6">
          <label className="form-label small text-muted">Hành động</label>
          <select
            className="form-select form-select-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="ON">Bật</option>
            <option value="OFF">Tắt</option>
          </select>
        </div>

        <div className="col-8">
          <label className="form-label small text-muted">Thời gian</label>
          <input
            type="time"
            className="form-control form-control-sm"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className="col-4 d-flex align-items-end">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            <label className="form-check-label small">Lặp lại</label>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-sm w-100 mb-3"
        onClick={addSchedule}
        disabled={loading}
      >
        {loading ? "⏳ Đang xử lý..." : "➕ Thêm lịch hẹn"}
      </button>

      <h6 className="fw-bold mb-2">📋 DANH SÁCH LỊCH</h6>

      {schedules.length === 0 ? (
        <div className="text-center text-muted small py-2">
          Chưa có lịch hẹn nào
        </div>
      ) : (
        <ul className="list-group list-group-flush">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="list-group-item d-flex justify-content-between align-items-center px-2"
            >
              <div>
                <div className="fw-semibold small">
                  {deviceLabel[s.device] || s.device}
                </div>
                <div className="small text-muted">
                  {actionBadge(s.action)} • {formatTime(s.schedule_time)} •{" "}
                  {s.repeat_daily ? "Mỗi ngày" : "Một lần"}
                </div>
              </div>

              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => deleteSchedule(s.id)}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
