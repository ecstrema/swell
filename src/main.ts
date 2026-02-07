import { addFile, openFileDialog, getHierarchy, isTauri } from "./backend.js";
import "./components/menu/menu-bar.ts";

class FileDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set filename(val: string) {
    this.shadowRoot!.innerHTML = `<p>Current File: <strong>${val}</strong></p>`;
  }
}

customElements.define('file-display', FileDisplay);

async function handleFileOpen(fileDisplay: FileDisplay) {
      try {
        const file = await openFileDialog();
        if (file) {
          const result = await addFile(file);
          fileDisplay.filename = result;

          const hierarchy = await getHierarchy(result);
          console.log("Hierarchy:", hierarchy);
        }
      } catch (err) {
        console.error("Error loading file:", err);
      }
}

window.addEventListener("DOMContentLoaded", () => {
  const filePickerBtn = document.querySelector("#file-picker-btn") as HTMLButtonElement | null;
  const fileDisplay = document.querySelector("#file-display") as FileDisplay;
  const menuBar = document.querySelector("app-menu-bar");

  // Hook up custom menu event
  if (menuBar) {
      menuBar.addEventListener("file-open-request", () => {
          handleFileOpen(fileDisplay);
      });
  }

  if (filePickerBtn) {
    filePickerBtn.addEventListener("click", () => handleFileOpen(fileDisplay));
  }
});
