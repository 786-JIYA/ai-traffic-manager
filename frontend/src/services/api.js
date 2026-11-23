
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = {
    async getLatestTraffic(intersectionId = "intersection_01") {
        const response = await fetch(
            `${API_BASE_URL}/traffic/latest?intersection_id=${encodeURIComponent(intersectionId)}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch traffic data: ${response.status}`);
        }

        return response.json();
    },

    async getTrafficHistory(intersectionId = "intersection_01") {
        const response = await fetch(
            `${API_BASE_URL}/traffic/history?intersection_id=${encodeURIComponent(intersectionId)}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch traffic history: ${response.status}`);
        }

        return response.json();
    },
    async getLatestSignalState(intersectionId = "intersection_01") {
        const response = await fetch(
            `${API_BASE_URL}/signals/latest?intersection_id=${encodeURIComponent(intersectionId)}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch signal state: ${response.status}`);
        }

        return response.json();
    },

    async getSignalHistory(intersectionId = "intersection_01") {
        const response = await fetch(
            `${API_BASE_URL}/signals/history?intersection_id=${encodeURIComponent(intersectionId)}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch signal history: ${response.status}`);
        }

        return response.json();
    },
};



export default api;
