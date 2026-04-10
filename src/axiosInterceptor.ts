import axios from "axios";
import { API_ENDPOINT, LOGIN_URL } from "./const";

const ACCESS_TOKEN_REQUIRED_PATHS = ["/mfa_setup", "/mfa_verify", "/user_invitation"];

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    throw new Error("Invalid JWT payload");
  }
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const binary = window.atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as Record<string, unknown>;
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeJwtPayload(token);
    const expireDate = decoded["exp"] as number;
    const timestamp = Math.floor(Date.now() / 1000);
    return expireDate <= timestamp;
  } catch {
    return true;
  }
};

const refreshToken = async (): Promise<string> => {
  const res = await axios.get(`${API_ENDPOINT}/refresh`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    withCredentials: true,
  });

  const newIdToken = res.data.id_token;
  localStorage.setItem("SaaSusIdToken", newIdToken);

  const newAccessToken = res.data.access_token;
  localStorage.setItem("SaaSusAccessToken", newAccessToken);

  return newIdToken;
};

axios.interceptors.request.use(
  async (config) => {
    // refresh と credentials エンドポイントはインターセプターをスキップ
    if (
      config.url?.includes("/refresh") ||
      config.url?.includes("/credentials")
    ) {
      return config;
    }

    const token = localStorage.getItem("SaaSusIdToken");

    if (token && isTokenExpired(token)) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          isRefreshing = false;
          processQueue();

          if (config.headers) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (error) {
          isRefreshing = false;
          processQueue(error);
          window.location.href = LOGIN_URL;
          return Promise.reject(error);
        }
      } else {
        // リフレッシュ中の場合はキューに追加して待機
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            const newToken = localStorage.getItem("SaaSusIdToken");
            if (config.headers && newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
            return config;
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
    } else if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // アクセストークンが必要なエンドポイントにのみセット
    const needsAccessToken = ACCESS_TOKEN_REQUIRED_PATHS.some((path) => {
      try {
        const pathname = new URL(config.url!, window.location.origin).pathname;
        return pathname === path;
      } catch {
        return false;
      }
    });
    if (needsAccessToken) {
      const accessToken = localStorage.getItem("SaaSusAccessToken");
      if (accessToken && config.headers) {
        config.headers["X-Access-Token"] = accessToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
