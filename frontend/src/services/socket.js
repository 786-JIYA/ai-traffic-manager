import { io } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Several pages can listen at once (traffic + signals), so the connection is
// reference-counted: it opens for the first consumer and closes after the last.
let consumers = 0;

export const connectSocket = () => {
    consumers += 1;

    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    consumers = Math.max(0, consumers - 1);

    if (consumers === 0 && socket.connected) {
        socket.disconnect();
    }
};

export const subscribeToTrafficUpdates = (callback) => {
    socket.on("traffic:update", callback);

    return () => {
        socket.off("traffic:update", callback);
    };
};

export const subscribeToConnection = (onConnect, onDisconnect) => {
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
    };
};

export default socket;
