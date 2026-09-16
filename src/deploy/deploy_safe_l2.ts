import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("SafeL2", {
            account: deployer,
            artifact: artifacts.SafeL2,
            args: [],
        });
    },
    { tags: ["l2", "l2-suite", "main-suite"] },
);
