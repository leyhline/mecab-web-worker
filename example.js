import { MecabWorker } from "./dist/index.js";

const inputElement = document.getElementById("input");
const outputElement = document.getElementById("output");
const outTableElement = document.getElementById("outtable");
const logElement = document.getElementById("log");
const progressElement = document.getElementById("progress");

function appendToLog(message) {
  const textNode = document.createTextNode(message);
  const brElement = document.createElement("br");
  logElement.appendChild(textNode);
  logElement.appendChild(brElement);
  brElement.scrollIntoView();
}

let worker;
let size = 0;
progressElement.value = size;
try {
  worker = await MecabWorker.create("../ipadic-2.7.0_bin.zip", {
    onLoad: (message) => {
      if (size && message.total) {
        size += message.size;
        progressElement.value = size;
        progressElement.max = message.total;
      } else {
        progressElement.removeAttribute("value");
      }
      appendToLog(`load file with ${message.type}: ${message.name}`);
    },
  });
  progressElement.value = 1;
  progressElement.max = 1;
} catch (error) {
  appendToLog(error);
  progressElement.value = 0;
  progressElement.max = 1;
  throw error;
}

async function parse() {
  try {
    const parsed = await worker.parse(inputElement.value);
    const textNode = document.createTextNode(parsed);
    outputElement.replaceChildren(textNode);

    const parsedNodes = await worker.parseToNodes(inputElement.value);
    const trElements = parsedNodes.map((node) => {
      const trElement = document.createElement("tr");
      node.features.forEach((feature) => {
        const tdElement = document.createElement("td");
        const textNode = document.createTextNode(feature);
        tdElement.appendChild(textNode);
        trElement.appendChild(tdElement);
      });
      return trElement;
    });
    outTableElement.replaceChildren(...trElements);
  } catch (error) {
    appendToLog(error);
    throw error;
  }
}

parse();
inputElement.oninput = parse;
