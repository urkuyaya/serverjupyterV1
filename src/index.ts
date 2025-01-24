import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import Chart from 'chart.js/auto';
import '../style/index.css';
import logoUrl from '../style/images/logo.png';
import '@fortawesome/fontawesome-free/css/all.min.css';

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

  constructor() {
    super();
    this.id = 'serial-monitor-widget';
    this.title.label = 'Instumento-Virtual-UG';
    this.title.closable = true;

    this.node.innerHTML = `
    <div style="padding: 10px;">
      <h2 style="text-align: center;">INSTRUMENTO VIRTUAL</h2>
      <img src="${logoUrl}" alt="Logo" style="position: absolute; top: 10px; right: 10px; width: 50px; height: 50px;">
  
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
  
      <button id="connect-button">
        <i class="fas fa-plug"></i> Conectar
      </button>
      <button id="disconnect-button">
        <i class="fas fa-unlink"></i> Desconectar
      </button>
      <button id="start-button">
        <i class="fas fa-play"></i> Iniciar Adquisición
      </button>
      <button id="stop-button">
        <i class="fas fa-stop"></i> Detener Adquisición
      </button>
  
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
      this.websocket?.send(
        JSON.stringify({
          command: 'CONNECT',
          port: this.portInput.value,
          baudrate: parseInt(this.baudrateInput.value),
          databits: this.dataBitsInput.value,
          parity: this.parityInput.value
        })
      );
    };
    this.websocket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.data) {
        this.logToTerminal(message.data);
        if (message.data.includes('Connected')) {
          this.isConnected = true;
        }
      }
      if (message.voltage !== undefined && message.timestamp !== undefined) {
        this.updateChartData(message.voltage);
      }
    };
  }

  private handleDisconnectClick(): void {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ command: 'DISCONNECT' }));
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
      this.logToTerminal('Desconectado del puerto.');
    }
  }

  private handleStartClick(): void {
    if (this.isConnected && !this.isAcquiring) {
      this.isAcquiring = true;
      this.websocket?.send(JSON.stringify({ command: 'START' }));
      this.logToTerminal('Adquisición iniciada.');
    }
  }

  private handleStopClick(): void {
    if (this.isConnected && this.isAcquiring) {
      this.isAcquiring = false;
      this.websocket?.send(JSON.stringify({ command: 'STOP' }));
      this.logToTerminal('Adquisición detenida.');
    }
  }

  public updateChartData(value: number): void {
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
class VoltageDisplayWidget extends Widget {
  private voltageDisplay: HTMLElement;

  constructor() {
    super();
    this.id = 'voltage-display-widget';
    this.title.label = 'Voltímetro';
    this.title.closable = true;

    this.node.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2>Pantalla de Voltaje</h2>
        <div id="voltage-display" style="
          font-size: 48px; 
          font-weight: bold; 
          color: #007BFF; 
          border: 2px solid #000; 
          width: 300px; 
          margin: 0 auto; 
          padding: 20px; 
          border-radius: 10px;">
          0.00 V
        </div>
      </div>
    `;

    this.voltageDisplay = this.node.querySelector('#voltage-display')!;
  }

  public updateVoltage(value: number): void {
    this.voltageDisplay.textContent = `${value.toFixed(2)} V`;
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'serial-monitor',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    // Instanciar los widgets existentes y el nuevo
    const serialMonitorWidget = new SerialMonitorWidget(); // Widget del gráfico
    const voltageDisplayWidget = new VoltageDisplayWidget(); // Nuevo widget del voltímetro

    // Agregar el widget del gráfico
    app.shell.add(serialMonitorWidget, 'right');

    // Agregar el widget del voltímetro
    app.shell.add(voltageDisplayWidget, 'right');

    // Crear conexión WebSocket
    const wsUrl = `ws://${window.location.host}/serial-terminal/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connection established.');
    };

    websocket.onmessage = event => {
      const message = JSON.parse(event.data);

      // Mantener la funcionalidad del gráfico
      if (message.voltage !== undefined) {
        serialMonitorWidget.updateChartData(message.voltage);
        voltageDisplayWidget.updateVoltage(message.voltage); // Actualizar voltímetro
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed.');
    };
  }
};

export default plugin;
