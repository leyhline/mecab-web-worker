import { MecabWorker, IPADIC } from "./dist/index.js";

const inputElement = document.getElementById("input");
const outputElement = document.getElementById("output");
const outTableElement = document.getElementById("outtable");
const logElement = document.getElementById("log");

function appendToLog(message) {
  const textNode = document.createTextNode(message);
  const brElement = document.createElement("br");
  logElement.appendChild(textNode);
  logElement.appendChild(brElement);
  brElement.scrollIntoView();
}

const worker = await MecabWorker.create(IPADIC, {
  onCache: (filename) => appendToLog("file read from cache: " + filename),
  onUnzip: (filename) => console.log("unzipped file: " + filename),
});

async function parse() {
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
}

parse();
inputElement.oninput = parse;
