import json
from tornado.websocket import WebSocketHandler, WebSocketClosedError
from tornado.ioloop import IOLoop, PeriodicCallback
from jupyter_server.utils import url_path_join

class SimulatedSerialWebSocketHandler(WebSocketHandler):
    def open(self):
        print("WebSocket connection established")
        self.write_message(json.dumps({"data": "Connection established"}))
        # Iniciar la simulación de datos periódicos
        self.simulation_callback = PeriodicCallback(self.send_simulated_data, 1000)
        self.simulation_callback.start()

    def on_message(self, message):
        try:
            data = json.loads(message)
            print(f"Received message: {data}")
            # Procesar el mensaje recibido según sea necesario
        except json.JSONDecodeError as e:
            error_message = f"Error decoding JSON: {str(e)}"
            print(error_message)
            self.write_message(json.dumps({"error": error_message}))

    def send_simulated_data(self):
        simulated_data = {"data": "Simulated serial data"}
        print(f"Sending simulated data: {simulated_data}")
        try:
            self.write_message(json.dumps(simulated_data))
        except WebSocketClosedError:
            print("WebSocket is closed; stopping simulation.")
            self.simulation_callback.stop()

    def on_close(self):
        print("WebSocket connection closed")
        # Detener la simulación de datos si aún está en ejecución
        if hasattr(self, 'simulation_callback') and self.simulation_callback.is_running():
            self.simulation_callback.stop()

def setup_handlers(web_app):
    base_url = web_app.settings["base_url"]
    host_pattern = ".*$"
    websocket_route = url_path_join(base_url, "serial-terminal", "ws")
    handlers = [(websocket_route, SimulatedSerialWebSocketHandler)]
    web_app.add_handlers(host_pattern, handlers)
