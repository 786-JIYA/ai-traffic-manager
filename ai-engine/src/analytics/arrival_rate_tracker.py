
from collections import defaultdict, deque


class ArrivalRateTracker:

    def __init__(self, window_seconds=60):
        self.window_seconds = window_seconds
        self.arrivals = defaultdict(deque)
        self.seen_tracks = set()

    def record_arrival(self, approach_id, track_id, timestamp):
        key = (approach_id, track_id)

        # Count each track only once per approach.
        if key in self.seen_tracks:
            return

        self.seen_tracks.add(key)
        self.arrivals[approach_id].append(timestamp)

    def calculate(self, current_time):

        rates = {}

        for approach_id, timestamps in self.arrivals.items():

            # Remove arrivals outside the rolling time window.
            while (
                timestamps
                and current_time - timestamps[0] > self.window_seconds
            ):
                timestamps.popleft()

            rates[approach_id] = round(
                len(timestamps) * 60 / self.window_seconds,
                2
            )

        return rates
