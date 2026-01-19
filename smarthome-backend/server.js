const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

const WS_PORT = 4000;
const HTTP_PORT = 3000;
const ARDUINO_PORT = "COM3";
const BAUDRATE = 9600;

const wss = new WebSocket.Server({ port: WS_PORT });
const app = express();
app.use(cors());
app.use(express.json());

// ================== MYSQL ==================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "smarthome",
});

db.connect((err) => {
  if (err) console.log("MySQL Error:", err);
  else console.log("Connected to MySQL");
});

// ================== WEBSOCKET ==================
wss.on("connection", (ws) => {
  console.log("Frontend connected to WebSocket");
});

// Helper gửi WebSocket an toàn
function wsBroadcast(msg) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ================== ARDUINO  ==================
let port;
function connectArduino() {
  try {
    port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUDRATE });
    const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    port.on("open", () => {
      console.log("Connected to Arduino:", ARDUINO_PORT);
    });

    port.on("error", (err) => {
      console.log("Serial Error:", err.message);
    });

    port.on("close", () => {
      console.log("Serial closed. Reconnecting in 5s...");
      setTimeout(connectArduino, 5000);
    });

    // ===== NHẬN DATA TỪ ARDUINO =====
    parser.on("data", (raw) => {
      const data = raw.trim();
      console.log("From Arduino:", data);

      // Gửi log thô (debug)
      wsBroadcast(data);

      // --------- XỬ LÝ RFID REQUEST ----------
      if (data.includes("RFID:") && data.includes("UID:")) {
        let uid = data.split("UID:")[1].trim();
        const cleanUID = uid.replace(/-/g, "").toUpperCase();

        const sqlUser = "SELECT id, name, role FROM Users WHERE uid = ?";
        db.query(sqlUser, [cleanUID], (err, rows) => {
          if (err) {
            console.log("MySQL RFID Error:", err);
            return;
          }

          if (rows.length > 0) {
            const { id, name, role } = rows[0];

            const requestMsg = JSON.stringify({
              type: "RFID_REQUEST",
              uid: cleanUID,
              name,
              role,
              user_id: id,
              action: "REQUEST",
              time: new Date().toISOString(),
            });

            console.log("Sending RFID_REQUEST:", requestMsg);
            wsBroadcast(requestMsg);
          } else {
            console.log("UID không tồn tại:", cleanUID);
          }
        });
      }

      // --------- LƯU DỮ LIỆU CẢM BIẾN ----------
      if (data.startsWith("TEMP:")) {
        try {
          let parts = data.split(",");

          let temp = parseFloat(parts[0].replace("TEMP:", "").trim());
          let hum = parseFloat(parts[1].replace("HUM:", "").trim());
          let light = parseInt(parts[2].replace("LIGHT:", "").trim());
          let gas = parseInt(parts[3].replace("GAS:", "").trim());
          let water = parseInt(parts[4].replace("WATER:", "").trim());
          let door = parts[5].replace("DOOR:", "").trim();
          let mode = parts[6].replace("MODE:", "").trim();

          const sql = `
            INSERT INTO SensorData (temp, hum, light, gas, water, door, mode)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(sql, [temp, hum, light, gas, water, door, mode], (err) => {
            if (err) console.log("Insert Sensor Error:", err);
          });
        } catch (e) {
          console.log("Parse Sensor Error:", e);
        }
      }
    });
  } catch (e) {
    console.log("Cannot open COM. Retrying...");
    setTimeout(connectArduino, 5000);
  }
}

connectArduino();

// ================== HẸN GIỜ (FIX LỆCH GIÂY) ==================
setInterval(() => {
  const now = new Date();
  const timeNow = now.toTimeString().slice(0, 8); // HH:MM:SS

  const sql = `
    SELECT * FROM DeviceSchedule
    WHERE active = 1
    AND schedule_time <= ?
    AND schedule_time >= TIME_SUB(?, INTERVAL 30 SECOND)
  `;

  db.query(sql, [timeNow, timeNow], (err, rows) => {
    if (err) {
      console.log("Schedule Error:", err);
      return;
    }

    rows.forEach((row) => {
      let command = "";

      switch (row.device) {
        case "LIGHT":
          command = row.action === "ON" ? "RELAY_LIGHT" : "RELAY_OFF";
          break;
        case "FAN":
          command = row.action === "ON" ? "RELAY_FAN" : "RELAY_OFF";
          break;
        case "AC":
          command = row.action === "ON" ? "RELAY_AC" : "RELAY_OFF";
          break;
        case "PUMP":
          command = row.action === "ON" ? "RELAY_PUMP" : "RELAY_OFF";
          break;
      }

      if (command) {
        console.log(`⏰ SCHEDULE: ${row.device} -> ${row.action}`);
        port.write(command + "\n");

        // Nếu không lặp mỗi ngày → tắt lịch
        if (row.repeat_daily === 0) {
          db.query("UPDATE DeviceSchedule SET active = 0 WHERE id = ?", [
            row.id,
          ]);
        }
      }
    });
  });
}, 30000);

// ================== API ==================

// Lấy dữ liệu cảm biến mới nhất
app.get("/api/sensors", (req, res) => {
  const sql = "SELECT * FROM SensorData ORDER BY time DESC LIMIT 1";

  db.query(sql, (err, result) => {
    if (err) res.status(500).json(err);
    else res.json(result[0]);
  });
});

// Lấy lịch sử ra/vào
app.get("/api/accesslog", (req, res) => {
  const sql = "SELECT * FROM AccessLog ORDER BY time DESC LIMIT 50";

  db.query(sql, (err, result) => {
    if (err) res.status(500).json(err);
    else res.json(result);
  });
});

// Gửi lệnh xuống Arduino
app.post("/api/command", (req, res) => {
  const { cmd } = req.body;
  port.write(cmd + "\n");
  res.json({ status: "sent", command: cmd });
});

// Lấy danh sách lịch
app.get("/api/schedule", (req, res) => {
  db.query(
    "SELECT * FROM DeviceSchedule ORDER BY schedule_time ASC",
    (err, rows) => {
      if (err) res.status(500).json(err);
      else res.json(rows);
    },
  );
});

// Thêm lịch (active = 1 mặc định)
app.post("/api/schedule", (req, res) => {
  const { device, action, schedule_time, repeat_daily } = req.body;

  const sql = `
    INSERT INTO DeviceSchedule (device, action, schedule_time, repeat_daily, active)
    VALUES (?, ?, ?, ?, 1)
  `;

  db.query(sql, [device, action, schedule_time, repeat_daily], (err) => {
    if (err) res.status(500).json(err);
    else res.json({ status: "ok" });
  });
});

// Xóa lịch
app.delete("/api/schedule/:id", (req, res) => {
  db.query(
    "DELETE FROM DeviceSchedule WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) res.status(500).json(err);
      else res.json({ status: "deleted" });
    },
  );
});

// ================== XÁC NHẬN TRUY CẬP (GRANTED) ==================
app.post("/api/confirm-access", (req, res) => {
  const { uid, name, role, user_id } = req.body;

  const sql = `
    INSERT INTO AccessLog (uid, name, role, action, time, user_id)
    VALUES (?, ?, ?, 'GRANTED', NOW(), ?)
  `;

  db.query(sql, [uid, name, role, user_id || null], (err) => {
    if (err) {
      console.log("Save AccessLog Error:", err);
      return res.status(500).json({ status: "error" });
    }

    console.log("AccessLog saved: GRANTED", uid);

    const confirmMsg = JSON.stringify({
      type: "RFID_SAVED",
      uid,
      name,
      role,
      action: "GRANTED",
      time: new Date().toISOString(),
    });

    wsBroadcast(confirmMsg);
    res.json({ status: "ok" });
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`Server running on http://localhost:${HTTP_PORT}`);
});
