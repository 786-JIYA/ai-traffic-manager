
import time
from datetime import datetime, timezone


class SignalPhaseManager:

    def __init__(
        self,
        backend_client=None,
        intersection_id="intersection_01",
        yellow_time=3,
        all_red_time=2,
        min_green=10,
        max_green=60
    ):
        self.backend_client = backend_client
        self.intersection_id = intersection_id

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

    def report_state(self):
        if self.backend_client is None:
            return

        payload = {
            "intersection_id": self.intersection_id,
            "active_phase": self.current_phase,
            "state": self.current_state,
            "green_duration": self.green_duration,
            "elapsed_seconds": round(self.elapsed_time(), 2),
            "observed_at": datetime.now(timezone.utc).isoformat(),
            "simulation_mode": True
        }

        response = self.backend_client.send_signal_state(payload)

        if response:
            print(
                f"Signal state reported successfully: "
                f"{self.current_state}"
            )
        else:
            print(
                f"Failed to report signal state: "
                f"{self.current_state}"
            )

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

        self.report_state()

        return self.get_status()

    def start_yellow(self):
        if self.current_state != "GREEN":
            raise RuntimeError("Yellow requires GREEN.")

        if self.elapsed_time() < self.green_duration:
            raise RuntimeError("Minimum green duration is not complete.")

        self.current_state = "YELLOW"
        self.state_started_at = time.monotonic()

        self.report_state()

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

        self.report_state()

        return self.get_status()

    def elapsed_time(self):
        return time.monotonic() - self.state_started_at

    def get_status(self):
        return {
            "state": self.current_state,
            "active_phase": self.current_phase,
            "elapsed_seconds": round(self.elapsed_time(), 2),
        }
