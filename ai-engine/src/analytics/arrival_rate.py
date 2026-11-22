
class ArrivalRate:

    def __init__(self):
        self.arrival_counts = {}

    def record_arrival(self, approach_id):
        self.arrival_counts[approach_id] = (
            self.arrival_counts.get(approach_id, 0) + 1
        )

    def calculate(self, elapsed_seconds):
        if elapsed_seconds <= 0:
            raise ValueError("Elapsed time must be greater than zero.")

        rates = {}

        for approach_id, count in self.arrival_counts.items():
            rates[approach_id] = round(
                count / elapsed_seconds * 60, 2
            )

        return rates

    def reset(self):
        self.arrival_counts.clear()
