
from src.analytics.phase_selector import PhaseSelector
from src.analytics.green_time_calculator import GreenTimeCalculator


class TrafficDecisionEngine:

    def __init__(self):
        self.phase_selector = PhaseSelector()
        self.green_calculator = GreenTimeCalculator(
            min_green=10,
            max_green=60
        )

    def make_decision(self, traffic_data, current_phase=None):

        next_phase = self.phase_selector.select_next_phase(
            traffic_data,
            current_phase
        )

        if next_phase is None:
            return None

        selected_traffic = traffic_data[next_phase]

        green_time = self.green_calculator.calculate(
            waiting_vehicles=selected_traffic["waiting"],
            arrival_rate=selected_traffic["arrival_rate"]
        )

        return {
            "selected_phase": next_phase,
            "green_duration": green_time,
            "reason": "Highest estimated traffic demand"
        }
