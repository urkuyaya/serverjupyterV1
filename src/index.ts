import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';

class SerialMonitorWidget extends Widget {
  private terminal: HTMLTextAreaElement;
  private commandInput: HTMLInputElement;
  private websocket: WebSocket | null = null;

  constructor() {
    super();
    this.id = 'serial-monitor-widget';
    this.title.label = 'Serial Monitor';
    this.title.closable = true;

    // Interfaz del monitor serial
    this.node.innerHTML = `
      <div style="padding: 10px;">
        <label for="port">Port:</label>
        <input type="text" id="port" placeholder="/dev/ttyUSB0" style="width: 100%; margin-bottom: 5px;">
        
        <label for="baudrate">Baudrate:</label>
        <input type="number" id="baudrate" value="9600" style="width: 100%; margin-bottom: 10px;">

        <textarea id="serial-terminal" readonly style="width: 100%; height: 300px; font-family: monospace; margin-bottom: 10px;"></textarea>

        <input type="text" id="command-input" placeholder="Enter command" style="width: 80%; font-family: monospace; margin-right: 5px;">
        <button id="send-button" style="padding: 10px; width: 18%; font-size: 14px;">
          Send
        </button>
      </div>
    `;

    // Vincula eventos a los elementos del DOM
    const sendButton =
      this.node.querySelector<HTMLButtonElement>('#send-button');
    this.terminal =
      this.node.querySelector<HTMLTextAreaElement>('#serial-terminal')!;
    this.commandInput =
      this.node.querySelector<HTMLInputElement>('#command-input')!;

    if (sendButton) {
      sendButton.addEventListener('click', this.handleSendClick.bind(this));
    }

    // Conecta automáticamente al WebSocket
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    const portInput = this.node.querySelector<HTMLInputElement>('#port')!;
    const baudrateInput =
      this.node.querySelector<HTMLInputElement>('#baudrate')!;

    const port = portInput.value || '/dev/ttyUSB0';
    const baudrate = baudrateInput.valueAsNumber || 9600;

    const wsUrl = `ws://${window.location.host}/serial-terminal/ws`;
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      // Envía la configuración inicial del puerto y la velocidad
      this.websocket?.send(JSON.stringify({ port, baudrate }));
      this.terminal.value += `Connected to ${port} at ${baudrate} baudrate.\n`;
    };

    this.websocket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.data) {
        this.terminal.value += `${message.data}\n`;
      } else if (message.error) {
        this.terminal.value += `Error: ${message.error}\n`;
      }
      this.terminal.scrollTop = this.terminal.scrollHeight;
    };

    this.websocket.onerror = error => {
      console.error('WebSocket error:', error);
      this.terminal.value += 'WebSocket error.\n';
    };

    this.websocket.onclose = () => {
      this.terminal.value += 'Disconnected from serial terminal.\n';
    };
  }

  private handleSendClick(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      alert('WebSocket is not connected.');
      return;
    }

    const command = this.commandInput.value.trim();
    if (!command) {
      alert('Please enter a command to send.');
      return;
    }

    // Envía el comando al WebSocket
    this.websocket.send(JSON.stringify({ command }));
    this.terminal.value += `>> ${command}\n`; // Muestra el comando enviado en el terminal
    this.commandInput.value = ''; // Limpia el campo de entrada
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'serial-monitor',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Serial Monitor Plugin is activated!');
    const widget = new SerialMonitorWidget();
    app.shell.add(widget, 'right');
  }
};

export default plugin;
