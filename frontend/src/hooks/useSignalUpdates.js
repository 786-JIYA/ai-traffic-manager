import { useEffect, useState } from "react";
import socket, { connectSocket, disconnectSocket } from "../services/socket";

export default function useSignalUpdates(intersectionId = "intersection_01") {
    const [signalData, setSignalData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        const handleSignalUpdate = (data) => {
            if (data.intersection_id !== intersectionId) return;

            setSignalData(data);
            setLastUpdated(data.observed_at);
        };

        socket.on("signal:update", handleSignalUpdate);
        connectSocket();

        return () => {
            socket.off("signal:update", handleSignalUpdate);
            disconnectSocket();
        };
    }, [intersectionId]);

    return {
        signalData,
        setSignalData,
        lastUpdated,
        setLastUpdated,
    };
}
