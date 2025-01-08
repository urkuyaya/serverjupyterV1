import json
from tornado.websocket import WebSocketHandler
from jupyter_server.utils import url_path_join


class DebugWebSocketHandler(WebSocketHandler):
    """
    WebSocket handler for testing backend-to-frontend communication.
    """
    def open(self):
        print("WebSocket connection established")
        self.write_message(json.dumps({"data": "Hello from the backend!"}))

    def on_message(self, message):
        try:
            data = json.loads(message)
            print(f"Received message: {data}")
            self.write_message(json.dumps({"data": f"Echo: {data}"}))
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            print(error_message)
            self.write_message(json.dumps({"error": error_message}))

    def on_close(self):
        print("WebSocket connection closed")


def setup_handlers(web_app):
    """
    Register WebSocket handlers for debugging.
    """
    base_url = web_app.settings["base_url"]
    host_pattern = ".*$"

    websocket_route = url_path_join(base_url, "debug-terminal", "ws")
    handlers = [(websocket_route, DebugWebSocketHandler)]
    web_app.add_handlers(host_pattern, handlers)
