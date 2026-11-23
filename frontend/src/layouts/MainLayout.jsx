
import { Outlet } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import Topbar from "../components/common/Topbar";

const MainLayout = () => {
    return (
        <div className="app-layout">
            <Sidebar />

            <div className="main-container">
                <Topbar />

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
