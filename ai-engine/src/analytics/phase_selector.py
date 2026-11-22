
class PhaseSelector:

    def select_next_phase(self, traffic_data, current_phase=None):

        candidates = []

        for approach, data in traffic_data.items():

            if approach == current_phase:
                continue

            waiting = data["waiting"]
            arrival_rate = data["arrival_rate"]

            demand_score = waiting + (arrival_rate * 0.5)

            candidates.append({
                "approach": approach,
                "demand_score": demand_score,
            })

        if not candidates:
            return None

        candidates.sort(
            key=lambda item: item["demand_score"],
            reverse=True
        )

        return candidates[0]["approach"]
