import json
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import serial  # Biblioteca para interactuar con el puerto serie

class HelloHandler(APIHandler):
    """
    Handle GET requests at /serial-ext-jlab/hello
    """
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": "This is /serial-ext-jlab/hello endpoint!"
        }))

class PostExampleHandler(APIHandler):
    """
    Handle POST requests at /serial-ext-jlab/post-example
    """
    @tornado.web.authenticated
    def post(self):
        input_data = self.get_json_body()
        response_data = {
            "message": f"Hello {input_data.get('name', 'Anonymous')}, this is a POST response!"
        }
        self.finish(json.dumps(response_data))

class SerialPortHandler(APIHandler):
    """
    Handle POST requests at /serial-ext-jlab/serial-port
    """
    @tornado.web.authenticated
    def post(self):
        try:
            # Obtén los datos enviados desde el frontend
            input_data = self.get_json_body()
            port = input_data.get("port", "/dev/ttyUSB0")  # Puerto serie (por defecto)
            baudrate = input_data.get("baudrate", 9600)  # Velocidad (por defecto)
            command = input_data.get("command", "")  # Comando a enviar

            # Abre el puerto serie
            with serial.Serial(port, baudrate, timeout=1) as ser:
                # Envía el comando
                ser.write(command.encode())
                # Lee la respuesta del dispositivo
                response = ser.read(ser.in_waiting or 1).decode()

            # Devuelve la respuesta al frontend
            self.finish(json.dumps({"response": response}))

        except Exception as e:
            # Maneja errores y devuelve un mensaje al frontend
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

def setup_handlers(web_app):
    """
    Register the handlers with the Jupyter web application.
    """
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    # Register endpoints
    hello_route = url_path_join(base_url, "serial-ext-jlab", "hello")
    post_example_route = url_path_join(base_url, "serial-ext-jlab", "post-example")
    serial_port_route = url_path_join(base_url, "serial-ext-jlab", "serial-port")

    handlers = [
        (hello_route, HelloHandler),
        (post_example_route, PostExampleHandler),
        (serial_port_route, SerialPortHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)
