const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 4000 });
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

// ================== ARDUINO ==================
const port = new SerialPort({ path: "COM3", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

wss.on("connection", () => {
  console.log("Frontend connected to WebSocket");
});

// ================== NHẬN DATA TỪ ARDUINO ==================
parser.on("data", (data) => {
  data = data.trim();
  console.log("From Arduino:", data);

  // ===== GỬI RAW LOG (chỉ để debug) =====
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

  // ================== XỬ LÝ RFID (REQUEST) ==================
  if (data.includes("RFID:") && data.includes("UID:")) {
    let uid = data.split("UID:")[1].trim();
    const cleanUID = uid.replace(/-/g, "").toUpperCase();

    const sqlUser = "SELECT id, name, role FROM Users WHERE uid = ?";
    db.query(sqlUser, [cleanUID], (err, rows) => {
      if (err) {
        console.log("MySQL RFID Error:", err);
        return;
      }

      if (rows && rows.length > 0) {
        const user_id = rows[0].id;
        const name = rows[0].name;
        const role = rows[0].role;

        // CHỈ GỬI REQUEST (CHƯA LƯU DB)
        const requestMsg = JSON.stringify({
          type: "RFID_REQUEST",
          uid: cleanUID,
          name,
          role,
          user_id,
          action: "REQUEST",
          time: new Date().toISOString(),
        });

        console.log("Sending RFID_REQUEST:", requestMsg);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(requestMsg);
          }
        });
      } else {
        console.log("UID không tồn tại trong DB:", cleanUID);
      }
    });
  }

  // ================== LƯU DỮ LIỆU CẢM BIẾN ==================
  if (data.includes("TEMP:")) {
    try {
      let parts = data.split(",");

      let temp = parts[0].replace("TEMP:", "").trim();
      let hum = parts[1].replace("HUM:", "").trim();
      let light = parts[2].replace("LIGHT:", "").trim();
      let gas = parts[3].replace("GAS:", "").trim();
      let water = parts[4].replace("WATER:", "").trim();
      let door = parts[5].replace("DOOR:", "").trim();
      let mode = parts[6].replace("MODE:", "").trim();

      temp = parseFloat(temp.replace(/[^\d.-]/g, ""));
      hum = parseFloat(hum.replace(/[^\d.-]/g, ""));
      light = parseInt(light);
      gas = parseInt(gas);
      water = parseInt(water);

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

// ================== HẸN GIỜ (ĐÃ FIX CHỐNG LẶP) ==================
setInterval(() => {
  const now = new Date();
  const timeNow = now.toTimeString().slice(0, 8); // HH:MM:SS

  const sql = `
    SELECT * FROM DeviceSchedule
    WHERE active = 1
    AND schedule_time BETWEEN 
        TIME_SUB(?, INTERVAL 30 SECOND)
        AND ?
  `;

  db.query(sql, [timeNow, timeNow], (err, rows) => {
    if (err) {
      console.log("Schedule Error:", err);
      return;
    }

    rows.forEach((row) => {
      let command = "";

      if (row.device === "LIGHT") {
        command = row.action === "ON" ? "RELAY_LIGHT" : "RELAY_OFF";
      } else if (row.device === "FAN") {
        command = row.action === "ON" ? "RELAY_FAN" : "RELAY_OFF";
      } else if (row.device === "AC") {
        command = row.action === "ON" ? "RELAY_AC" : "RELAY_OFF";
      } else if (row.device === "PUMP") {
        command = row.action === "ON" ? "RELAY_PUMP" : "RELAY_OFF";
      }

      if (command !== "") {
        console.log(`⏰ SCHEDULE TRIGGER: ${row.device} -> ${row.action}`);
        port.write(command + "\n");

        // Nếu không lặp mỗi ngày → tắt lịch sau khi chạy
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
    if (err) res.json(err);
    else res.json(result[0]);
  });
});

// Lấy lịch sử ra/vào
app.get("/api/accesslog", (req, res) => {
  const sql = "SELECT * FROM AccessLog ORDER BY time DESC LIMIT 50";

  db.query(sql, (err, result) => {
    if (err) res.json(err);
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
      if (err) res.json(err);
      else res.json(rows);
    },
  );
});

// Thêm lịch (ĐÃ FIX LỖI ACTIVE)
app.post("/api/schedule", (req, res) => {
  const { device, action, schedule_time, repeat_daily } = req.body;

  const sql = `
    INSERT INTO DeviceSchedule (device, action, schedule_time, repeat_daily, active)
    VALUES (?, ?, ?, ?, 1)
  `;

  db.query(sql, [device, action, schedule_time, repeat_daily], (err) => {
    if (err) res.json(err);
    else res.json({ status: "ok" });
  });
});

// Xóa lịch
app.delete("/api/schedule/:id", (req, res) => {
  db.query(
    "DELETE FROM DeviceSchedule WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) res.json(err);
      else res.json({ status: "deleted" });
    },
  );
});

// ================== XÁC NHẬN TRUY CẬP (LƯU GRANTED) ==================
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

    console.log("✅ AccessLog saved: GRANTED", uid);

    const confirmMsg = JSON.stringify({
      type: "RFID_SAVED",
      uid,
      name,
      role,
      action: "GRANTED",
      time: new Date().toISOString(),
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(confirmMsg);
      }
    });

    res.json({ status: "ok" });
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
