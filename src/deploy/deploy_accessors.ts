import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("SimulateTxAccessor", {
            account: deployer,
            artifact: artifacts.SimulateTxAccessor,
            args: [],
        });
    },
    { tags: ["accessors", "l2-suite", "main-suite"] },
);
