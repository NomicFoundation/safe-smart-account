import { setupDeployScripts } from "rocketh";

import { type Accounts, type Data, type Extensions, extensions } from "./config.js";

// Re-exported so a deploy script gets typed artifacts and `deployScript` from one import.
import * as artifacts from "../generated/artifacts/index.js";
export { artifacts };

const { deployScript } = setupDeployScripts<Extensions, Accounts, Data>(extensions);

export { deployScript };
