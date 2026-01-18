import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./components/Header";
import ControlPanel from "./components/ControlPanel";
import SensorPanel from "./components/SensorPanel";
import ChartTemp from "./components/ChartTemp";
import LogPanel from "./components/LogPanel";
import AccessLogTable from "./components/AccessLogTable";
import SchedulePanel from "./components/SchedulePanel";

function App() {
  return (
    <div
      className="container-fluid p-3 bg-light"
      style={{ minHeight: "100vh" }}
    >
      <Header />

      <div className="row mt-3 g-3">
        {/* ===== LEFT PANEL ===== */}
        <div className="col-xl-3 col-lg-4 col-md-5">
          <div className="sticky-top" style={{ top: "10px" }}>
            <ControlPanel />
            <div className="mt-3">
              <SchedulePanel />
            </div>
          </div>
        </div>

        {/* ===== CENTER PANEL ===== */}
        <div className="col-xl-9 col-lg-8 col-md-7">
          {/* Sensor luôn ở trên cùng */}
          <SensorPanel />

          {/* CHART + LOG nằm cùng hàng */}
          <div className="row mt-3 g-3">
            <div className="col-lg-8 col-md-7">
              <ChartTemp />
            </div>
            <div className="col-lg-4 col-md-5">
              <LogPanel />
            </div>
          </div>

          {/* ACCESS LOG Ở GIỮA, bên dưới Chart + Log */}
          <div className="mt-3">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">🔑 Access Log (Trung tâm)</h5>
              </div>
              <div className="card-body p-0">
                <AccessLogTable />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
