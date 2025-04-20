import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const domNode = document.getElementById("mb-blasters-app");
if (!domNode) throw "Unable to find DOM element with id `mb-blasters-app`.";

const root = createRoot(domNode);
root.render(<App />);
