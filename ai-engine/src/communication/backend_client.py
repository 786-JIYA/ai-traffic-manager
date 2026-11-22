import requests


class BackendClient:

    def __init__(self, base_url="http://localhost:5000"):
        self.analytics_url = (
            f"{base_url}/api/traffic/analytics"
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