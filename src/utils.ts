import axios from "axios";
import { API_ENDPOINT, LOGIN_URL } from "./const";

type Jwt = {
  [name: string]: string | number | boolean;
};

const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

export const idTokenCheck = async (jwtToken: string) => {
  const base64Url = jwtToken.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(
    decodeURIComponent(escape(window.atob(base64)))
  ) as Jwt;

  const expireDate = decoded["exp"] as number;
  const timestamp = parseInt(Date.now().toString().slice(0, 10));
  if (expireDate <= timestamp) {
    try {
      console.log("token expired");
      const res = await axios.get(`${API_ENDPOINT}/refresh`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        withCredentials: true,
      });

      jwtToken = res.data.id_token;
      localStorage.setItem("SaaSusIdToken", jwtToken);

      const accessToken = res.data.access_token;
      localStorage.setItem("SaaSusAccessToken", accessToken);

      await sleep(1);
      return;
    } catch (err) {
      console.log(err);
      window.location.href = LOGIN_URL;
    }
  }
};
