import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import Chart from 'chart.js/auto';

class SerialMonitorWidget extends Widget {
  private terminal: HTMLTextAreaElement;
  private portInput: HTMLInputElement;
  private baudrateInput: HTMLInputElement;
  private dataBitsInput: HTMLSelectElement;
  private parityInput: HTMLSelectElement;
  private websocket: WebSocket | null = null;
  private chart: Chart | null = null;
  private isConnected: boolean = false;
  private isAcquiring: boolean = false;
  private dataInterval: any = null;

  constructor() {
    super();
    this.id = 'serial-monitor-widget';
    this.title.label = 'Serial Monitor';
    this.title.closable = true;

    this.node.innerHTML = `
      <div style="padding: 10px;">
        <label for="port">Puerto:</label>
        <input type="text" id="port" placeholder="/dev/ttyUSB0" style="width: 100%;">

        <label for="baudrate">Baudrate:</label>
        <input type="number" id="baudrate" value="9600" style="width: 100%;">

        <label for="databits">Bits de datos:</label>
        <select id="databits" style="width: 100%;">
          <option value="7">7</option>
          <option value="8" selected>8</option>
        </select>

        <label for="parity">Paridad:</label>
        <select id="parity" style="width: 100%;">
          <option value="none" selected>None</option>
          <option value="even">Even</option>
          <option value="odd">Odd</option>
        </select>

        <button id="connect-button">Conectar</button>
        <button id="disconnect-button">Desconectar</button>
        <button id="start-button">Iniciar Adquisición</button>
        <button id="stop-button">Detener Adquisición</button>

        <canvas id="data-chart" style="width: 100%; height: 300px;"></canvas>
        <textarea id="serial-terminal" readonly style="width: 100%; height: 100px;"></textarea>
      </div>
    `;

    this.terminal =
      this.node.querySelector<HTMLTextAreaElement>('#serial-terminal')!;
    this.portInput = this.node.querySelector<HTMLInputElement>('#port')!;
    this.baudrateInput =
      this.node.querySelector<HTMLInputElement>('#baudrate')!;
    this.dataBitsInput =
      this.node.querySelector<HTMLSelectElement>('#databits')!;
    this.parityInput = this.node.querySelector<HTMLSelectElement>('#parity')!;

    const connectButton =
      this.node.querySelector<HTMLButtonElement>('#connect-button');
    const disconnectButton =
      this.node.querySelector<HTMLButtonElement>('#disconnect-button');
    const startButton =
      this.node.querySelector<HTMLButtonElement>('#start-button');
    const stopButton =
      this.node.querySelector<HTMLButtonElement>('#stop-button');

    connectButton?.addEventListener(
      'click',
      this.handleConnectClick.bind(this)
    );
    disconnectButton?.addEventListener(
      'click',
      this.handleDisconnectClick.bind(this)
    );
    startButton?.addEventListener('click', this.handleStartClick.bind(this));
    stopButton?.addEventListener('click', this.handleStopClick.bind(this));

    this.initializeChart();
  }

  private initializeChart(): void {
    const ctx = this.node
      .querySelector<HTMLCanvasElement>('#data-chart')
      ?.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: 'Datos', data: [], borderColor: 'blue', fill: false }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: { display: true },
            y: { display: true }
          }
        }
      });
    }
  }

  private handleConnectClick(): void {
    const wsUrl = `ws://${window.location.host}/serial-terminal/ws`;
    this.websocket = new WebSocket(wsUrl);
    this.websocket.onopen = () => {
      this.isConnected = true;
      this.logToTerminal(
        `Conectado al puerto ${this.portInput.value} a ${this.baudrateInput.value} baud, ${this.dataBitsInput.value} bits, paridad ${this.parityInput.value}.`
      );
    };
  }

  private handleDisconnectClick(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
      clearInterval(this.dataInterval);
      this.logToTerminal('Desconectado del puerto.');
    }
  }

  private handleStartClick(): void {
    if (this.isConnected && !this.isAcquiring) {
      this.isAcquiring = true;
      this.dataInterval = setInterval(() => {
        const simulatedValue = Math.random() * 100;
        this.updateChartData(simulatedValue);
      }, 1000);
      this.logToTerminal('Iniciando adquisición.');
    }
  }

  private handleStopClick(): void {
    if (this.isAcquiring) {
      this.isAcquiring = false;
      clearInterval(this.dataInterval);
      this.logToTerminal('Adquisición detenida.');
    }
  }

  private updateChartData(value: number): void {
    const dataset = this.chart!.data.datasets[0];
    const labels = this.chart!.data.labels as string[];
    labels.push(new Date().toLocaleTimeString());
    dataset.data.push(value);
    this.chart!.update();
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
    const widget = new SerialMonitorWidget();
    app.shell.add(widget, 'right');
  }
};

export default plugin;
