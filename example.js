import { MecabWorker } from "./dist/index.js";

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

let worker;
try {
  worker = await MecabWorker.create(
    { url: "../ipadic-2.7.0_bin.zip", cacheName: "ipadic-2.7.0_bin" },
    {
      onCache: (filename) => appendToLog("file read from cache: " + filename),
      onUnzip: (filename) => appendToLog("unzipped file: " + filename),
    }
  );
} catch (error) {
  appendToLog(error);
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
