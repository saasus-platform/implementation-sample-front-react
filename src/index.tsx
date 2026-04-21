import axios from "axios";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const getTraceId = (): string => {
  const key = "SaaSusTraceId";
  let traceId = sessionStorage.getItem(key);
  if (!traceId) {
    traceId = crypto.randomUUID();
    sessionStorage.setItem(key, traceId);
  }
  return traceId;
};

axios.interceptors.request.use((config) => {
  config.headers["X-Saasus-Trace-Id"] = getTraceId();
  return config;
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<App />);
