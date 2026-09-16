import { setupEnvironmentFromFiles } from "@rocketh/node";
import { setupHardhatDeploy } from "hardhat-deploy/helpers";

import { type Accounts, type Data, type Extensions, extensions } from "./config.js";

// `loadAndExecuteDeploymentsFromFiles` is what the tests use to put the deployments in place;
// `loadEnvironmentFromHardhat` is what a task uses to read deployments that already exist.
const { loadAndExecuteDeploymentsFromFiles } = setupEnvironmentFromFiles<Extensions, Accounts, Data>(extensions);
const { loadEnvironmentFromHardhat } = setupHardhatDeploy<Extensions, Accounts, Data>(extensions);

export { loadAndExecuteDeploymentsFromFiles, loadEnvironmentFromHardhat };
