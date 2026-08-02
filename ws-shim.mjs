// Temporary shim: expose the `ws` package as globalThis.WebSocket so the
// Convex CLI can connect (Node in this sandbox lacks a global WebSocket).
import { WebSocket } from "ws";

globalThis.WebSocket = WebSocket;
