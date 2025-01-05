import json
from tornado.websocket import WebSocketHandler
from jupyter_server.utils import url_path_join
import serial
import threading

class SerialWebSocketHandler(WebSocketHandler):
    """
    WebSocket handler for serial port communication.
    """
    def initialize(self, serial_reader):
        self.serial_reader = serial_reader

    def open(self):
        print("WebSocket connection established")
        self.serial_reader.add_client(self)
        self.write_message(json.dumps({"data": "WebSocket connection established."}))

    def on_message(self, message):
        try:
            data = json.loads(message)
            print(f"Received message: {data}")
            
            if "command" in data:
                # Write a command to the serial port
                print(f"Sending command: {data['command']}")
                self.serial_reader.send_command(data["command"])
            elif "port" in data and "baudrate" in data:
                # Configure the serial port
                print(f"Configuring serial port: {data['port']} at {data['baudrate']}")
                self.serial_reader.start_reading(data["port"], data["baudrate"])
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            print(error_message)
            self.write_message(json.dumps({"error": error_message}))

    def on_close(self):
        print("WebSocket connection closed")
        self.serial_reader.remove_client(self)

class SerialReader:
    """
    Handles serial port reading and writing.
    """
    def __init__(self):
        self.clients = []
        self.serial_port = None
        self.running = False

    def add_client(self, client):
        self.clients.append(client)

    def remove_client(self, client):
        if client in self.clients:
            self.clients.remove(client)

    def send_command(self, command):
        if self.serial_port and self.serial_port.is_open:
            try:
                print(f"Writing to serial port: {command}")
                self.serial_port.write(f"{command}\n".encode())  # Add newline for standard serial communication
            except Exception as e:
                print(f"Error writing to serial port: {e}")
                self._broadcast_to_clients(f"Error writing to serial port: {e}")
        else:
            print("Serial port is not open.")
            self._broadcast_to_clients("Serial port is not open.")

    def start_reading(self, port, baudrate):
        if self.running:
            self.stop_reading()

        try:
            print(f"Attempting to open port {port} at baudrate {baudrate}")
            self.serial_port = serial.Serial(port, baudrate, timeout=1)
            self.running = True
            print(f"Port {port} successfully opened at {baudrate} baudrate")
            threading.Thread(target=self._read_serial, daemon=True).start()
        except Exception as e:
            print(f"Error opening serial port: {e}")
            self._broadcast_to_clients(f"Error opening serial port: {e}")

    def stop_reading(self):
        self.running = False
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
            print("Serial port closed.")

    def _read_serial(self):
        while self.running:
            try:
                if self.serial_port.in_waiting > 0:
                    data = self.serial_port.readline().decode().strip()
                    print(f"Received from serial port: {data}")
                    self._broadcast_to_clients(data)
            except Exception as e:
                print(f"Error reading from serial port: {e}")
                self._broadcast_to_clients(f"Error reading from serial port: {e}")
                self.stop_reading()

    def _broadcast_to_clients(self, message):
        for client in self.clients:
            try:
                client.write_message(json.dumps({"data": message}))
            except Exception as e:
                print(f"Error sending message to client: {e}")

def setup_handlers(web_app):
    """
    Register WebSocket handlers.
    """
    base_url = web_app.settings["base_url"]
    host_pattern = ".*$"

    serial_reader = SerialReader()

    websocket_route = url_path_join(base_url, "serial-terminal", "ws")
    handlers = [
        (websocket_route, SerialWebSocketHandler, {"serial_reader": serial_reader}),
    ]
    web_app.add_handlers(host_pattern, handlers)
