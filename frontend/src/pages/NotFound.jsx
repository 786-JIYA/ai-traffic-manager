import { Link } from "react-router-dom";

const NotFound = () => {
    return (
        <main className="notfound">
            <div className="road-sign" aria-hidden="true">
                <span>404</span>
            </div>

            <h1>This road doesn’t lead anywhere</h1>
            <p>The page you asked for doesn’t exist or has moved.</p>

            <Link to="/" className="btn btn-primary">
                Back to the dashboard
            </Link>
        </main>
    );
};

export default NotFound;
