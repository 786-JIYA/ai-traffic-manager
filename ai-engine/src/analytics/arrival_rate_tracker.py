
from collections import defaultdict, deque


class ArrivalRateTracker:

    def __init__(
        self,
        window_seconds=60,
        track_timeout_seconds=5.0,
    ):
        self.window_seconds = window_seconds
        self.track_timeout_seconds = track_timeout_seconds

        self.arrivals = defaultdict(deque)

        # Stores the last time each track was observed.
        self.active_tracks = {}

        # Stores when arrival-rate measurement started.
        self.start_time = None

    def record_arrival(self, approach_id, track_id, timestamp):
        key = (approach_id, track_id)

        # Update the last-seen timestamp.
        if key in self.active_tracks:
            self.active_tracks[key] = timestamp
            return False

        # First observation of this track in this approach.
        self.active_tracks[key] = timestamp
        self.arrivals[approach_id].append(timestamp)

        return True

    def initialize_track(self, approach_id, track_id, timestamp):
        """
        Register vehicles already present when analysis starts.
        These vehicles are not counted as new arrivals.
        """
        key = (approach_id, track_id)
        self.active_tracks[key] = timestamp

    def calculate(self, current_time):

        rates = {}

        # Set the starting time on the first calculation.
        if self.start_time is None:
            self.start_time = current_time

        # Remove expired tracking records.
        expired_tracks = [
            key
            for key, last_seen in self.active_tracks.items()
            if current_time - last_seen > self.track_timeout_seconds
        ]

        for key in expired_tracks:
            del self.active_tracks[key]

        # Use elapsed time during startup.
        # After 60 seconds, use the full rolling window.
        elapsed_time = max(0, current_time - self.start_time)

        effective_window = min(
            self.window_seconds,
            elapsed_time,
        )

        # Calculate rolling arrival rates.
        for approach_id, timestamps in self.arrivals.items():

            while (
                timestamps
                and current_time - timestamps[0] > self.window_seconds
            ):
                timestamps.popleft()

            if effective_window > 0:
                rate = len(timestamps) * 60 / effective_window
            else:
                rate = 0

            rates[approach_id] = round(rate, 2)

        return rates
