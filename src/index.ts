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

    this.node.innerHTML = `
      <div style="padding: 10px;">
        <textarea id="serial-terminal" readonly style="width: 100%; height: 300px; font-family: monospace; margin-bottom: 10px;"></textarea>
        <input type="text" id="command-input" placeholder="Enter command" style="width: 80%; margin-right: 5px;">
        <button id="send-button" style="padding: 10px; width: 18%; font-size: 14px;">Send</button>
        <button id="connect-button" style="padding: 10px; width: 100%; font-size: 14px; margin-top: 10px;">Connect</button>
      </div>
    `;

    this.terminal =
      this.node.querySelector<HTMLTextAreaElement>('#serial-terminal')!;
    this.commandInput =
      this.node.querySelector<HTMLInputElement>('#command-input')!;

    const sendButton =
      this.node.querySelector<HTMLButtonElement>('#send-button');
    const connectButton =
      this.node.querySelector<HTMLButtonElement>('#connect-button');

    sendButton?.addEventListener('click', this.handleSendClick.bind(this));
    connectButton?.addEventListener(
      'click',
      this.handleConnectClick.bind(this)
    );
  }

  private connectWebSocket(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
    }

    const wsUrl = `ws://${window.location.host}/serial-terminal/ws`;
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      this.logToTerminal('Connected to simulated serial terminal.');
    };

    this.websocket.onmessage = event => {
      console.log('Message received from WebSocket:', event.data); // Debug log
      try {
        const message = JSON.parse(event.data);
        if (message.data) {
          this.logToTerminal(message.data);
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
    this.connectWebSocket();
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

    this.websocket.send(JSON.stringify({ command }));
    this.logToTerminal(`>> ${command}`);
    this.commandInput.value = '';
  }

  private logToTerminal(message: string): void {
    this.terminal.value += `${message}\n`;
    this.terminal.scrollTop = this.terminal.scrollHeight;
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
