
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Radio,
    ChartNoAxesCombined,
    TrafficCone,
    Activity,
    Settings,
    ChevronLeft,
} from "lucide-react";

const navigation = [
    {
        title: "OVERVIEW",
        items: [
            { name: "Dashboard", path: "/", icon: LayoutDashboard },
            { name: "Live Monitoring", path: "/live-monitoring", icon: Radio },
            { name: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
            { name: "Signal Management", path: "/signals", icon: TrafficCone },
        ],
    },
];

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <Activity size={24} />
                </div>

                <div>
                    <h2>AI Traffic</h2>
                    <span>MANAGEMENT SYSTEM</span>
                </div>
            </div>

            <div className="sidebar-section">
                {navigation.map((section) => (
                    <div key={section.title}>
                        <p className="sidebar-heading">{section.title}</p>

                        {section.items.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === "/"}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? "active" : ""}`
                                    }
                                >
                                    <Icon size={19} />
                                    <span>{item.name}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="sidebar-bottom">
                <div className="system-status">
                    <span className="status-dot"></span>
                    <div>
                        <strong>System Online</strong>
                        <small>Monitoring active</small>
                    </div>
                </div>

                <button className="settings-link">
                    <Settings size={18} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
