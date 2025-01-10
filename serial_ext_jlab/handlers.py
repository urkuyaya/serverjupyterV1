import json
from tornado.websocket import WebSocketHandler
from jupyter_server.utils import url_path_join
from tornado.ioloop import IOLoop, PeriodicCallback


class SerialWebSocketHandler(WebSocketHandler):
    """
    WebSocket handler for serial port communication simulation.
    """
    clients = set()

    def open(self):
        print("WebSocket connection established")
        self.clients.add(self)
        self.write_message(json.dumps({"data": "WebSocket connection established."}))

        # Simulate periodic data to send to the frontend
        self.periodic_callback = PeriodicCallback(self.send_simulated_data, 1000)
        self.periodic_callback.start()

    def on_message(self, message):
        try:
            data = json.loads(message)
            print(f"Received message: {data}")

            # Echo back the received command for simulation purposes
            if "command" in data:
                self.write_message(json.dumps({"data": f"Echo: {data['command']}"}))
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            print(error_message)
            self.write_message(json.dumps({"error": error_message}))

    def on_close(self):
        print("WebSocket connection closed")
        self.clients.remove(self)

        # Stop periodic data when the client disconnects
        if hasattr(self, 'periodic_callback') and self.periodic_callback.is_running():
            self.periodic_callback.stop()

    def send_simulated_data(self):
        """
        Send simulated data to the frontend periodically.
        """
        simulated_data = {
            "timestamp": IOLoop.current().time(),
            "value": self.generate_random_value()
        }
        for client in list(self.clients):
            client.write_message(json.dumps(simulated_data))

    def generate_random_value(self):
        """
        Generate a random value for simulation.
        """
        import random
        return random.uniform(0, 100)


def setup_handlers(web_app):
    """
    Register WebSocket handlers.
    """
    base_url = web_app.settings["base_url"]
    host_pattern = ".*$"

    websocket_route = url_path_join(base_url, "serial-terminal", "ws")
    handlers = [
        (websocket_route, SerialWebSocketHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
