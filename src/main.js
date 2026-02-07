import init, { load_file_wasm, list_files } from "../backend/pkg/backend";

class FileLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          font-family: sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      </style>
      <div class="container">
        <h2>Load Wave File</h2>
        <input type="file" id="fileInput" />
        <button id="loadBtn">Load</button>
        <div id="output"></div>
      </div>
    `;


    const button = /** @type {!HTMLButtonElement} */ (this.shadowRoot.getElementById('loadBtn'));
    const input = /** @type {!HTMLInputElement} */ (this.shadowRoot.getElementById('fileInput'));
    const output = /** @type {!HTMLDivElement} */ (this.shadowRoot.getElementById('output'));

    button.addEventListener('click', async () => {
        const files = input.files;
        if (!files || files.length === 0) {
            output.textContent = "Please select a file.";
            return;
        }
        const file = files[0];
        if (file) {
            output.textContent = `Loading ${file.name}...`;
            try {
                const result = await load_file_wasm(file);
                output.textContent = `Success: ${result}`;
                console.log("Files loaded:", list_files());
            } catch (e) {
                output.textContent = `Error: ${e}`;
                console.error(e);
            }
        } else {
            output.textContent = "Please select a file.";
        }
    });
  }
}

customElements.define("file-loader", FileLoader);

async function main() {
    try {
        await init();
        const app = document.getElementById("app");
        if (app) {
            app.innerHTML = "<file-loader></file-loader>";
        }
    } catch (e) {
        console.error("Failed to init WASM", e);
    }
}

main();
