import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";

import { NAV_ITEMS } from "./navigation";

const useClock = () => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return now;
};

const Topbar = ({ onOpenMenu, onOpenSearch }) => {
    const { pathname } = useLocation();
    const now = useClock();

    const current = NAV_ITEMS.find((item) =>
        item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
    );

    const isMac =
        typeof navigator !== "undefined" && /mac/i.test(navigator.platform || "");

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="mobile-menu"
                    onClick={onOpenMenu}
                    aria-label="Open navigation"
                >
                    <Menu size={21} />
                </button>

                <div>
                    <p className="topbar-label">Traffic control centre</p>
                    <h2>{current?.title || "AI Traffic Manager"}</h2>
                </div>
            </div>

            <div className="topbar-actions">
                <time className="topbar-clock" dateTime={now.toISOString()}>
                    {now.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })}
                </time>

                <button type="button" className="topbar-search" onClick={onOpenSearch}>
                    <Search size={17} />
                    <span>Go to page</span>
                    <kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
                </button>

                <button type="button" className="notification-button" aria-label="Notifications">
                    <Bell size={20} />
                    <span className="notification-dot" />
                </button>

                <div className="user-profile">
                    <div className="user-avatar">A</div>
                    <div>
                        <strong>Administrator</strong>
                        <small>Control operator</small>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
