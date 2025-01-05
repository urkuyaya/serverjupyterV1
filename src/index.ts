import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import { requestAPI } from './handler';

// Clase del botón que interactúa con el puerto serie
class SerialButtonWidget extends Widget {
  constructor() {
    super();
    this.id = 'serial-port-widget';
    this.title.label = 'Serial Port';
    this.title.closable = true;

    // HTML del botón
    this.node.innerHTML = `
            <div style="padding: 10px;">
                <label for="port">Port:</label>
                <input type="text" id="port" placeholder="/dev/ttyUSB0" style="width: 100%; margin-bottom: 5px;">
                
                <label for="baudrate">Baudrate:</label>
                <input type="number" id="baudrate" value="9600" style="width: 100%; margin-bottom: 5px;">

                <label for="command">Command:</label>
                <input type="text" id="command" placeholder="Enter command" style="width: 100%; margin-bottom: 10px;">

                <button id="serial-button" style="padding: 10px; width: 100%; font-size: 14px;">
                    Send Command to Serial Port
                </button>
            </div>
        `;

    // Vincula el clic al botón
    const button = this.node.querySelector('#serial-button');
    if (button) {
      button.addEventListener('click', this.handleButtonClick.bind(this));
    }
  }

  private async handleButtonClick(): Promise<void> {
    // Obtiene los valores ingresados por el usuario
    const portInput = this.node.querySelector<HTMLInputElement>('#port');
    const baudrateInput =
      this.node.querySelector<HTMLInputElement>('#baudrate');
    const commandInput = this.node.querySelector<HTMLInputElement>('#command');

    const port = portInput?.value || '/dev/ttyUSB0';
    const baudrate = baudrateInput?.valueAsNumber || 9600;
    const command = commandInput?.value || '';

    // Valida que se haya ingresado un comando
    if (!command) {
      console.error('Command cannot be empty');
      alert('Please enter a command to send.');
      return;
    }

    try {
      // Enviar solicitud al servidor
      const response = await requestAPI<any>('serial-port', {
        method: 'POST',
        body: JSON.stringify({ port, baudrate, command }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response from serial port:', response);
      alert(`Response from Serial Port: ${response.response}`);
    } catch (error) {
      console.error('Error communicating with serial port:', error);
      alert(
        'Failed to communicate with serial port. Check console for details.'
      );
    }
  }
}

// Plugin para registrar el widget del botón en JupyterLab
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'serial-port-example',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Serial Port Plugin is activated!');
    const widget = new SerialButtonWidget();
    app.shell.add(widget, 'right'); // Agrega el widget a la barra lateral derecha
  }
};

export default plugin;
