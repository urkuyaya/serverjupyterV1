import json
import serial
import threading
from tornado.websocket import WebSocketHandler
from jupyter_server.utils import url_path_join
from tornado.ioloop import IOLoop, PeriodicCallback
import time

class SerialWebSocketHandler(WebSocketHandler):
    """
    WebSocket handler for serial port communication with real serial support.
    """
    clients = set()

    def initialize(self):
        self.serial_connection = None
        self.read_thread = None
        self.acquiring = False
        self.periodic_callback = None

    def open(self):
        print("WebSocket connection established")
        self.clients.add(self)
        self.write_message(json.dumps({"data": "WebSocket connection established."}))

    def on_message(self, message):
        try:
            data = json.loads(message)
            print(f"Received message: {data}")

            if "command" in data:
                command = data["command"].upper()
                if command == "CONNECT":
                    port = data.get("port", "/dev/ttyUSB0")
                    baudrate = data.get("baudrate", 9600)
                    databits = int(data.get("databits", 8))
                    parity = data.get("parity", "N").upper()
                    self.connect_serial(port, baudrate, databits, parity)
                elif command == "START":
                    self.start_acquisition()
                elif command == "STOP":
                    self.stop_acquisition()
                elif command == "DISCONNECT":
                    self.disconnect_serial()
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            print(error_message)
            IOLoop.current().add_callback(self.write_message, json.dumps({"error": error_message}))

    def on_close(self):
        print("WebSocket connection closed")
        self.clients.remove(self)
        self.stop_acquisition()
        self.disconnect_serial()

    def connect_serial(self, port, baudrate, databits, parity):
        try:
            if self.serial_connection and self.serial_connection.is_open:
                self.log_to_clients("Serial port already connected.")
                return

            parity_mapping = {'NONE': serial.PARITY_NONE, 'EVEN': serial.PARITY_EVEN, 'ODD': serial.PARITY_ODD}
            self.serial_connection = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=databits,
                parity=parity_mapping.get(parity, serial.PARITY_NONE),
                timeout=1
            )
            self.log_to_clients(f"Connected to {port} at {baudrate} baud, {databits} bits, {parity} parity.")
        except serial.SerialException as e:
            self.log_to_clients(f"Failed to connect: {e}")

    def disconnect_serial(self):
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            self.serial_connection = None
            self.log_to_clients("Serial port disconnected.")

    def start_acquisition(self):
        if self.serial_connection and self.serial_connection.is_open:
            self.acquiring = True
            self.periodic_callback = PeriodicCallback(self.read_serial_data, 1000)
            self.periodic_callback.start()
            self.serial_connection.write(b'{"command":"START"}\n')
            self.log_to_clients("Started data acquisition.")
        else:
            self.log_to_clients("Serial port is not connected.")

    def stop_acquisition(self):
        if self.acquiring:
            self.acquiring = False
            if self.periodic_callback and self.periodic_callback.is_running():
                self.periodic_callback.stop()
            if self.serial_connection and self.serial_connection.is_open:
                self.serial_connection.write(b'{"command":"STOP"}\n')
            self.log_to_clients("Stopped data acquisition.")

    def read_serial_data(self):
        if self.serial_connection and self.serial_connection.is_open:
            try:
                line = self.serial_connection.readline().decode('utf-8').strip()
                if line:
                    print(f"Data received: {line}")
                    parsed_data = self.format_data(line)
                    if parsed_data:
                        IOLoop.current().add_callback(self.broadcast_data, parsed_data)
            except Exception as e:
                IOLoop.current().add_callback(self.log_to_clients, f"Error reading data: {e}")

    def format_data(self, raw_data):
        try:
            data = json.loads(raw_data)
            timestamp = int(time.time())
            voltage = float(data.get("voltage", 0))
            formatted_data = {"timestamp": timestamp, "voltage": voltage}
            return json.dumps(formatted_data)
        except (ValueError, json.JSONDecodeError):
            return None

    def broadcast_data(self, data):
        for client in self.clients:
            # Enviar datos al gráfico y al cuadro de texto
            IOLoop.current().add_callback(client.write_message, data)
            IOLoop.current().add_callback(client.write_message, json.dumps({"data": data}))


    def log_to_clients(self, message):
        for client in self.clients:
            IOLoop.current().add_callback(client.write_message, json.dumps({"data": message}))


def setup_handlers(web_app):
    base_url = web_app.settings["base_url"]
    host_pattern = ".*$"
    websocket_route = url_path_join(base_url, "serial-terminal", "ws")
    handlers = [(websocket_route, SerialWebSocketHandler)]
    web_app.add_handlers(host_pattern, handlers)
