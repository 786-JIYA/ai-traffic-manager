import { NavLink } from "react-router-dom";
import { Settings, X } from "lucide-react";

import { NAV_ITEMS } from "./navigation";

// A small plan view of the junction this product manages.
const BrandMark = () => (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect x="12" y="1" width="8" height="30" rx="1.5" fill="currentColor" opacity="0.28" />
        <rect x="1" y="12" width="30" height="8" rx="1.5" fill="currentColor" opacity="0.28" />
        <rect x="12" y="12" width="8" height="8" fill="currentColor" />
        <path d="M16 3v6M16 23v6M3 16h6M23 16h6" stroke="#f2c14e" strokeWidth="1.6" strokeDasharray="2 2.4" />
    </svg>
);

const Sidebar = ({ open, onClose }) => {
    return (
        <>
            <div
                className={`sidebar-scrim ${open ? "show" : ""}`}
                onClick={onClose}
                aria-hidden="true"
            />

            <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <BrandMark />
                    </div>

                    <div>
                        <h2>AI Traffic</h2>
                        <span>Management system</span>
                    </div>

                    <button
                        type="button"
                        className="sidebar-close"
                        onClick={onClose}
                        aria-label="Close navigation"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-section">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/"}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? "active" : ""}`
                                }
                            >
                                <Icon size={20} />
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom">
                    <div className="system-status">
                        <span className="status-dot" />
                        <div>
                            <strong>System online</strong>
                            <small>Monitoring active</small>
                        </div>
                    </div>

                    <button type="button" className="settings-link">
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
