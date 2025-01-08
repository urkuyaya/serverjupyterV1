import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';

class SerialMonitorWidget extends Widget {
  private terminal: HTMLTextAreaElement;
  private portInput: HTMLInputElement;
  private baudrateInput: HTMLInputElement;
  private websocket: WebSocket | null = null;

  constructor() {
    super();
    this.id = 'serial-monitor-widget';
    this.title.label = 'Serial Monitor';
    this.title.closable = true;

    this.node.innerHTML = `
      <div style="padding: 10px;">
        <label for="port">Port:</label>
        <input type="text" id="port" placeholder="/dev/ttyUSB0" style="width: 100%; margin-bottom: 5px;">
        
        <label for="baudrate">Baudrate:</label>
        <input type="number" id="baudrate" value="9600" style="width: 100%; margin-bottom: 10px;">

        <textarea id="serial-terminal" readonly style="width: 100%; height: 300px; font-family: monospace; margin-bottom: 10px;"></textarea>

        <button id="connect-button" style="padding: 10px; width: 100%; font-size: 14px; margin-top: 10px;">
          Connect
        </button>
      </div>
    `;

    this.terminal =
      this.node.querySelector<HTMLTextAreaElement>('#serial-terminal')!;
    this.portInput = this.node.querySelector<HTMLInputElement>('#port')!;
    this.baudrateInput =
      this.node.querySelector<HTMLInputElement>('#baudrate')!;

    const connectButton =
      this.node.querySelector<HTMLButtonElement>('#connect-button');
    connectButton?.addEventListener(
      'click',
      this.handleConnectClick.bind(this)
    );
  }

  private connectWebSocket(port: string, baudrate: number): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
    }

    const wsUrl = `ws://${window.location.host}/debug-terminal/ws`;
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      this.logToTerminal(`Connected to ${port} at ${baudrate} baudrate.`);
      this.websocket?.send(JSON.stringify({ port, baudrate })); // Configura el puerto y baudrate
    };

    this.websocket.onmessage = event => {
      console.log('Message received from WebSocket:', event.data); // Log para depuración
      try {
        const message = JSON.parse(event.data);
        if (message.data) {
          this.logToTerminal(message.data); // Agrega mensaje al terminal
        } else if (message.error) {
          this.logToTerminal(`Error: ${message.error}`);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
        this.logToTerminal('Error parsing message from server.');
      }
    };

    this.websocket.onerror = error => {
      console.error('WebSocket error:', error);
      this.logToTerminal('WebSocket error.');
    };

    this.websocket.onclose = () => {
      this.logToTerminal('Disconnected from serial terminal.');
    };
  }

  private handleConnectClick(): void {
    const port = this.portInput.value.trim();
    const baudrate = this.baudrateInput.valueAsNumber;

    if (!port || !baudrate) {
      alert('Please enter a valid port and baudrate.');
      return;
    }

    this.connectWebSocket(port, baudrate);
  }

  private logToTerminal(message: string): void {
    this.terminal.value += `${message}\n`;
    this.terminal.scrollTop = this.terminal.scrollHeight; // Auto scroll
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
