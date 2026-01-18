import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function AccessLogTable() {
  const [rows, setRows] = useState([]);

  // ===== POPUP STATE =====
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [popupTitle, setPopupTitle] = useState("");
  const [isRequest, setIsRequest] = useState(false); // ← quan trọng

  const API = "http://localhost:3000";

  // ===== LẤY LOG TỪ API =====
  const fetchLog = async () => {
    try {
      const res = await fetch(API + "/api/accesslog");
      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error("Fetch log error:", err);
    }
  };

  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, []);

  // ===== GỬI XÁC NHẬN LÊN BACKEND =====
  const confirmAccess = async () => {
    if (!popupData) return;

    try {
      await fetch(API + "/api/confirm-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: popupData.uid,
          name: popupData.name,
          role: popupData.role,
          user_id: popupData.user_id || null,
        }),
      });

      setShowPopup(false);
    } catch (err) {
      console.error("Confirm access error:", err);
    }
  };

  // ===== WEBSOCKET LẮNG NGHE =====
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        if (!event.data.startsWith("{")) {
          console.log("Raw serial data ignored:", event.data);
          return;
        }

        const msg = JSON.parse(event.data);
        console.log("WS Message:", msg);

        // 🔥 VỪA QUẸT THẺ → CHƯA LƯU DB (CẦN XÁC NHẬN)
        if (msg.type === "RFID_REQUEST") {
          setPopupTitle("📡 Thẻ được nhận – cần xác nhận");
          setPopupData(msg);
          setIsRequest(true);
          setShowPopup(true);
        }

        // 🔥 ĐÃ LƯU VÀO DATABASE
        if (msg.type === "RFID_SAVED") {
          setPopupTitle("✅ Đã lưu vào Database");
          setPopupData(msg);
          setIsRequest(false);
          setShowPopup(true);

          // Reload bảng sau 1 giây
          setTimeout(fetchLog, 1000);
        }
      } catch (e) {
        console.log("WS parse error:", event.data, e);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => ws.close();
  }, []);

  return (
    <>
      <div className="card p-3">
        <h5>📋 Access Log</h5>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>UID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Action</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.uid}</td>
                <td>{r.name}</td>
                <td>{r.role}</td>
                <td>{r.action}</td>
                <td>{new Date(r.time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== POPUP ===== */}
      <Modal show={showPopup} onHide={() => setShowPopup(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{popupTitle}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {popupData && (
            <>
              <p>
                <strong>UID:</strong> {popupData.uid}
              </p>
              <p>
                <strong>Người dùng:</strong> {popupData.name}
              </p>
              <p>
                <strong>Vai trò:</strong> {popupData.role}
              </p>

              {popupData.action && (
                <p>
                  <strong>Hành động:</strong> {popupData.action}
                </p>
              )}

              <p>
                <strong>Thời gian:</strong>{" "}
                {new Date(popupData.time).toLocaleString()}
              </p>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {isRequest ? (
            <>
              <Button variant="secondary" onClick={() => setShowPopup(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={confirmAccess}>
                ✅ Xác nhận truy cập
              </Button>
            </>
          ) : (
            <Button variant="success" onClick={() => setShowPopup(false)}>
              OK
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}
