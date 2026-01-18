import { useState } from "react";

export default function ControlPanel() {
  const [loading, setLoading] = useState(null);
  const [lastCmd, setLastCmd] = useState("Chưa có lệnh");

  const sendCommand = async (cmd) => {
    try {
      setLoading(cmd);
      setLastCmd(cmd);

      await fetch("http://localhost:3000/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd }),
      });
    } catch (err) {
      console.log(err);
      setLastCmd("Lỗi kết nối");
    } finally {
      setLoading(null);
    }
  };

  const ControlGroup = ({ title, children }) => (
    <div className="mb-3">
      <h6 className="text-muted">{title}</h6>
      <div className="d-grid gap-2">{children}</div>
      <hr />
    </div>
  );

  const Btn = ({ color, cmd, label, icon }) => (
    <button
      className={`btn btn-${color}`}
      disabled={loading === cmd}
      onClick={() => sendCommand(cmd)}
    >
      {loading === cmd ? (
        <span>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
          ></span>
          Đang gửi...
        </span>
      ) : (
        <span>
          {icon} {label}
        </span>
      )}
    </button>
  );

  return (
    <div className="card p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>🔧 Control Panel</h5>
        <span className="small text-muted">
          Lệnh cuối: <b>{lastCmd}</b>
        </span>
      </div>

      <ControlGroup title="🚪 CỬA">
        <Btn color="success" cmd="OPEN_DOOR" label="Mở cửa" icon="🔓" />
        <Btn color="danger" cmd="CLOSE_DOOR" label="Đóng cửa" icon="🔒" />
      </ControlGroup>

      <ControlGroup title="💡 ĐÈN">
        <Btn color="warning" cmd="RELAY_LIGHT" label="Bật đèn" icon="💡" />
        <Btn color="secondary" cmd="RELAY_OFF" label="Tắt đèn" icon="⚫" />
      </ControlGroup>

      <ControlGroup title="🌀 QUẠT">
        <Btn color="info" cmd="RELAY_FAN" label="Bật quạt" icon="🌀" />
        <Btn color="secondary" cmd="RELAY_OFF" label="Tắt quạt" icon="⚫" />
      </ControlGroup>

      <ControlGroup title="💧 MÁY BƠM">
        <Btn color="primary" cmd="RELAY_PUMP" label="Bật bơm" icon="🚰" />
        <Btn color="secondary" cmd="RELAY_OFF" label="Tắt bơm" icon="⚫" />
      </ControlGroup>

      <ControlGroup title="🔊 CÒI/BUZZER">
        <Btn color="danger" cmd="BUZZ_ON" label="Bật còi" icon="🚨" />
        <Btn color="secondary" cmd="BUZZ_OFF" label="Tắt còi" icon="⚫" />
      </ControlGroup>
    </div>
  );
}
