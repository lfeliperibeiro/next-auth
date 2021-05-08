import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue = [];

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauth.token"]}`,
  },
});

// o response.use recebe dois parâmetros
// O primeiro é se a reposta der sucesso que no caso vou manter como esta
// O segundo é o que que eu quero fazer se a resposta der erro

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === "token.expired") {
        // renovar o token
        cookies = parseCookies();

        // vamos criar uma fila de requisições para que a aplicação pause até
        // que todas as requisições sejam feitas para depois renovar o token

        const { "nextauth.refreshToken": refreshToken } = cookies;
        // O config: É toda a configuração que passei para o backend
        const originalConfig = error.config;

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post("/refresh", {
              refreshToken,
            })
            .then((response) => {
              const { token } = response.data;

              setCookie(undefined, "nextauth.token", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 dias
                path: "/",
              });

              setCookie(
                undefined,
                "nextauth.refreshToken",
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 dias
                  path: "/",
                }
              );

              api.defaults.headers["Authorization"] = `Bearer ${token}`;

              failedRequestsQueue.forEach((request) =>
                request.onSuccess(token)
              );
              failedRequestsQueue = [];
            })
            .catch((err) => {
              failedRequestsQueue.forEach((request) => request.onFailure(err));
              failedRequestsQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
        // Como o axios não aceita async/await usamos uma Promise
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;
              // Estou fazendo uma nova chamada a api
              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        // deslogar o usuário
        signOut();
      }
    }
    return Promise.reject(error);
  }
);
