
import requests


class BackendClient:

    def __init__(self, base_url="http://localhost:5000"):
        base_url = base_url.rstrip("/")

        self.analytics_url = (
            f"{base_url}/api/traffic/analytics"
        )

        self.signal_url = (
            f"{base_url}/api/signals/state"
        )

    def send_analytics(self, payload):
        try:
            response = requests.post(
                self.analytics_url,
                json=payload,
                timeout=3,
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as error:
            print(f"Backend connection error: {error}")
            return None

    def send_signal_state(self, payload):
        try:
            response = requests.post(
                self.signal_url,
                json=payload,
                timeout=3,
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as error:
            print(f"Signal reporting error: {error}")
            return None
