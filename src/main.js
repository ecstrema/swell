import { greet } from "./backend.js";

let greetInputEl;
let greetMsgEl;

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  document.querySelector("#greet-form").addEventListener("submit", (e) => {
    e.preventDefault();
    greet(greetInputEl.value).then((msg) => {
      greetMsgEl.textContent = msg;
    });
  });
});
