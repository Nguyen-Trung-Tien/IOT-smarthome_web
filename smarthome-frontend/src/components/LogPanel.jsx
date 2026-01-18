import { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";

export default function LogPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");

    ws.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    return () => ws.close();
  }, []);

  return (
    <Card className="mt-3">
      <Card.Header>System Log (Real-time)</Card.Header>
      <Card.Body
        style={{
          background: "#111",
          color: "#0f0",
          height: "250px",
          overflowY: "scroll",
          fontFamily: "monospace",
        }}
      >
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </Card.Body>
    </Card>
  );
}
