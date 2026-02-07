import { addFile, openFileDialog, getHierarchy } from "./backend.js";

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

window.addEventListener("DOMContentLoaded", () => {
  const filePickerBtn = document.querySelector("#file-picker-btn") as HTMLButtonElement;
  const fileDisplay = document.querySelector("#file-display") as FileDisplay;

  if (filePickerBtn) {
    filePickerBtn.addEventListener("click", async () => {
      const file = await openFileDialog();
      if (file) {
        const result = await addFile(file);
        fileDisplay.filename = result;

        const hierarchy = await getHierarchy(result);
        console.log("Hierarchy:", hierarchy);
      }
    });
  }
});
