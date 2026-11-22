
class TrafficStatistics:

    def calculate(self, approach_statistics):
        summary = {
            "total_vehicles": 0,
            "waiting_vehicles": 0,
            "moving_vehicles": 0,
            "approaches": {},
        }

        for approach_id, data in approach_statistics.items():

            total = data["total"]
            waiting = data["waiting"]
            moving = data["moving"]

            # Initial congestion classification.
            # Thresholds will be calibrated later.
            if waiting >= 15:
                congestion = "high"
            elif waiting >= 7:
                congestion = "medium"
            else:
                congestion = "low"

            summary["approaches"][approach_id] = {
                "total_vehicles": total,
                "waiting_vehicles": waiting,
                "moving_vehicles": moving,
                "congestion_level": congestion,
            }

            summary["total_vehicles"] += total
            summary["waiting_vehicles"] += waiting
            summary["moving_vehicles"] += moving

        return summary
