import threading
import time
import json  # Importa el módulo json

class SerialReader:
    def __init__(self):
        self.clients = []

    def add_client(self, client):
        self.clients.append(client)

    def remove_client(self, client):
        self.clients.remove(client)

    def send_command(self, command):
        print(f"Command to send: {command}")
        # Aquí iría la lógica para enviar el comando al puerto serial

    def start_reading(self, port, baudrate):
        print(f"Starting to read from {port} at {baudrate} baudrate")
        # Aquí iría la lógica para iniciar la lectura del puerto serial
        # Por ejemplo, iniciar un hilo que lea del puerto serial y envíe los datos a los clientes
        threading.Thread(target=self._read_from_port, args=(port, baudrate)).start()

    def _read_from_port(self, port, baudrate):
        while True:
            # Simulación de lectura de datos del puerto serial
            data = f"Data from {port} at {baudrate}"
            for client in self.clients:
                client.write_message(json.dumps({"data": data}))
            time.sleep(1)  # Simulación de intervalo de lectura