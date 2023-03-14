/* @refresh reload */
import { render } from "solid-js/web";

import "tippy.js/dist/tippy.css";
import "./style.css";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
