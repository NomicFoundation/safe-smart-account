import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("Safe", {
            account: deployer,
            artifact: artifacts.Safe,
            args: [],
        });
    },
    { tags: ["singleton", "main-suite"] },
);
