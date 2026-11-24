// Shared traffic helpers used by the dashboard, monitoring, signals and 3D views.

export const APPROACHES = [
    { id: "bottom_left", name: "Bottom Left", direction: "Approach 01" },
    { id: "top_center", name: "Top Center", direction: "Approach 02" },
    { id: "left_side", name: "Left Side", direction: "Approach 03" },
    { id: "right_side", name: "Right Side", direction: "Approach 04" },
    { id: "bottom_right_slip", name: "Bottom Right Slip", direction: "Approach 05" },
];

export const LEVEL_COLORS = {
    low: "#3ddc97",
    medium: "#ffb224",
    high: "#ff5a52",
    none: "#6f87a3",
};

// The API can send either an array of rows or an object keyed by approach.
export const normalizeApproaches = (value) => {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
        return Object.entries(value).map(([approach, metrics]) => ({
            approach,
            ...metrics,
        }));
    }

    return [];
};

export const levelFromWaiting = (waiting) => {
    if (waiting >= 30) return "high";
    if (waiting >= 15) return "medium";
    return "low";
};

export const levelFromPercent = (percentage) => {
    if (percentage >= 60) return "high";
    if (percentage >= 30) return "medium";
    return "low";
};

export const percentOf = (part, total) => {
    if (!total || total <= 0) return 0;
    return Number(((part / total) * 100).toFixed(1));
};

export const sumBy = (rows, key) =>
    rows.reduce((sum, item) => sum + Number(item[key] || 0), 0);

export const indexByApproach = (rows) =>
    Object.fromEntries(rows.map((item) => [item.approach, item]));

export const formatClock = (value, withSeconds = true) => {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        ...(withSeconds ? { second: "2-digit" } : {}),
    });
};
