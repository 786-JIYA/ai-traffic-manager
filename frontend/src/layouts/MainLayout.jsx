import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import Topbar from "../components/common/Topbar";
import CommandPalette from "../components/common/CommandPalette";

const MainLayout = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const { pathname } = useLocation();

    // Close the mobile drawer whenever the page changes.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Ctrl/Cmd + K opens the page switcher from anywhere.
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setPaletteOpen((value) => !value);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="app-layout">
            <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

            <div className="main-container">
                <Topbar
                    onOpenMenu={() => setMenuOpen(true)}
                    onOpenSearch={() => setPaletteOpen(true)}
                />

                <main className="main-content">
                    <Outlet />
                </main>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
};

export default MainLayout;
