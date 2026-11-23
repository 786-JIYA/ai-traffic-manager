
import { Bell, Search, Menu } from "lucide-react";


const Topbar = () => {
    return (
        <header className="topbar">
            <div className="topbar-left">
                <button className="mobile-menu">
                    <Menu size={21} />
                </button>

                <div>
                    <p className="topbar-label">TRAFFIC CONTROL CENTER</p>
                    <h2>Intelligent Traffic Overview</h2>
                </div>
            </div>

            <div className="topbar-actions">
                <div className="topbar-search">
                    <Search size={17} />
                    <span>Search...</span>
                    <kbd>Ctrl K</kbd>
                </div>

                <button className="notification-button" aria-label="Notifications">
                    <Bell size={20} />
                    <span className="notification-dot"></span>
                </button>

                <div className="user-profile">
                    <div className="user-avatar">A</div>
                    <div>
                        <strong>Administrator</strong>
                        <small>Control Operator</small>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
