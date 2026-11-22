
import time


class SignalPhaseManager:

    def __init__(
        self,
        yellow_time=3,
        all_red_time=2,
        min_green=10,
        max_green=60
    ):
        self.yellow_time = yellow_time
        self.all_red_time = all_red_time
        self.min_green = min_green
        self.max_green = max_green

        self.current_phase = None
        self.current_state = "ALL_RED"
        self.state_started_at = time.monotonic()
        self.green_duration = None

        self.allowed_phases = [
            "bottom_left",
            "top_center",
            "left_side",
            "right_side",
            "bottom_right_slip",
        ]

    def start_green(self, phase, duration):
        if phase not in self.allowed_phases:
            raise ValueError("Invalid signal phase.")

        if self.current_state != "ALL_RED":
            raise RuntimeError("Green requires ALL_RED.")

        if duration < self.min_green or duration > self.max_green:
            raise ValueError("Green duration outside permitted limits.")

        if self.elapsed_time() < self.all_red_time:
            raise RuntimeError("All-red clearance is not complete.")

        self.current_phase = phase
        self.current_state = "GREEN"
        self.green_duration = duration
        self.state_started_at = time.monotonic()

        return self.get_status()

    def start_yellow(self):
        if self.current_state != "GREEN":
            raise RuntimeError("Yellow requires GREEN.")

        if self.elapsed_time() < self.green_duration:
            raise RuntimeError("Minimum green duration is not complete.")

        self.current_state = "YELLOW"
        self.state_started_at = time.monotonic()

        return self.get_status()

    def start_all_red(self):
        if self.current_state != "YELLOW":
            raise RuntimeError("ALL_RED requires YELLOW.")

        if self.elapsed_time() < self.yellow_time:
            raise RuntimeError("Yellow clearance is not complete.")

        self.current_state = "ALL_RED"
        self.current_phase = None
        self.green_duration = None
        self.state_started_at = time.monotonic()

        return self.get_status()

    def elapsed_time(self):
        return time.monotonic() - self.state_started_at

    def get_status(self):
        return {
            "state": self.current_state,
            "active_phase": self.current_phase,
            "elapsed_seconds": round(self.elapsed_time(), 2),
        }
