import {
    LayoutDashboard,
    Radio,
    ChartNoAxesCombined,
    TrafficCone,
} from "lucide-react";

export const NAV_ITEMS = [
    {
        name: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
        title: "Traffic dashboard",
        hint: "Queues, signal phase and a 3D view of the junction",
    },
    {
        name: "Live Monitoring",
        path: "/live-monitoring",
        icon: Radio,
        title: "Live monitoring",
        hint: "Camera feeds, AI detection and per-approach counts",
    },
    {
        name: "Analytics",
        path: "/analytics",
        icon: ChartNoAxesCombined,
        title: "Simulation analytics",
        hint: "Congestion trends and demand by approach",
    },
    {
        name: "Signal Management",
        path: "/signals",
        icon: TrafficCone,
        title: "Signal management",
        hint: "Current phase, demo mode and transition history",
    },
];
