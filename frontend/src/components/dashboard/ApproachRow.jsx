import { levelFromWaiting, percentOf } from "../../utils/traffic";

const SLOTS = 24;
const LEVEL_TEXT = { low: "Low", medium: "Medium", high: "High" };

/** One block per vehicle: coloured when waiting, pale when moving. */
const QueueStrip = ({ waiting, moving, level }) => {
    const total = waiting + moving;
    const filled = Math.min(total, SLOTS);
    const waitingSlots = total ? Math.round((filled * waiting) / total) : 0;

    return (
        <div
            className="queue-strip"
            role="img"
            aria-label={`${waiting} vehicles waiting, ${moving} moving`}
        >
            {Array.from({ length: SLOTS }, (_, i) => {
                let kind = "empty";
                if (i < waitingSlots) kind = `waiting ${level}`;
                else if (i < filled) kind = "moving";

                return <span key={i} className={`queue-car ${kind}`} />;
            })}
        </div>
    );
};

const ApproachRow = ({ approach, data }) => {
    const waiting = Number(data?.waiting_vehicles || 0);
    const moving = Number(data?.moving_vehicles || 0);
    const total = Number(data?.total_vehicles || 0);
    const level = data ? data.congestion_level || levelFromWaiting(waiting) : "none";

    return (
        <li className="approach-row">
            <div className="approach-row-head">
                <div>
                    <h3>{approach.name}</h3>
                    <small>{approach.direction}</small>
                </div>

                <span className={`level-chip ${level}`}>
                    <span className="level-dot" />
                    {LEVEL_TEXT[level] || "No data"}
                </span>
            </div>

            <QueueStrip waiting={waiting} moving={moving} level={level} />

            <dl className="approach-numbers">
                <div>
                    <dt>Waiting</dt>
                    <dd>{data ? waiting : "—"}</dd>
                </div>
                <div>
                    <dt>Moving</dt>
                    <dd>{data ? moving : "—"}</dd>
                </div>
                <div>
                    <dt>Congestion</dt>
                    <dd>{data ? `${percentOf(waiting, total)}%` : "—"}</dd>
                </div>
                <div>
                    <dt>Arrivals / min</dt>
                    <dd>{data ? Number(data.arrival_rate ?? 0).toFixed(1) : "—"}</dd>
                </div>
            </dl>
        </li>
    );
};

export default ApproachRow;
