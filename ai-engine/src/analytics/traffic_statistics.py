
class TrafficStatistics:

    def calculate(self, approach_statistics):

        summary = {
            "total_vehicles": 0,
            "waiting_vehicles": 0,
            "moving_vehicles": 0,
            "congestion_percentage": 0,
            "congestion_level": "low",
            "approaches": {},
        }

        for approach_id, data in approach_statistics.items():

            total = data["total"]
            waiting = data["waiting"]
            moving = data["moving"]

            # Calculate congestion percentage for this approach.
            congestion_percentage = (
                (waiting / total) * 100 if total > 0 else 0
            )

            # Initial congestion classification.
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
                "congestion_percentage": round(
                    congestion_percentage, 2
                ),
                "congestion_level": congestion,
            }

            summary["total_vehicles"] += total
            summary["waiting_vehicles"] += waiting
            summary["moving_vehicles"] += moving

        # Calculate overall intersection congestion.
        total = summary["total_vehicles"]
        waiting = summary["waiting_vehicles"]

        if total > 0:
            summary["congestion_percentage"] = round(
                (waiting / total) * 100, 2
            )

        if waiting >= 30:
            summary["congestion_level"] = "high"
        elif waiting >= 15:
            summary["congestion_level"] = "medium"
        else:
            summary["congestion_level"] = "low"

        return summary
