import { io } from "socket.io-client";

// In dev, Vite proxies /socket.io → localhost:3001.
// In production, point to your deployed server URL.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export const socket = io(SERVER_URL, { autoConnect: false });
