import { useEffect, useState } from "react";

import socket, {
    connectSocket,
    disconnectSocket,
    subscribeToTrafficUpdates,
    subscribeToConnection,
} from "../services/socket";

const useTrafficUpdates = (intersectionId = "intersection_01") => {
    const [trafficData, setTrafficData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const unsubscribeTraffic = subscribeToTrafficUpdates((data) => {
            if (data.intersection_id !== intersectionId) {
                return;
            }

            setTrafficData(data.approaches);
            setLastUpdated(data.timestamp);
        });

        const unsubscribeConnection = subscribeToConnection(
            () => setIsConnected(true),
            () => setIsConnected(false)
        );

        connectSocket();
        setIsConnected(socket.connected);

        return () => {
            unsubscribeTraffic();
            unsubscribeConnection();
            disconnectSocket();
        };
    }, [intersectionId]);

    return {
        trafficData,
        lastUpdated,
        isConnected,
    };
};

export default useTrafficUpdates;
