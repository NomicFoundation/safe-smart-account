import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("SafeProxyFactory", {
            account: deployer,
            artifact: artifacts.SafeProxyFactory,
            args: [],
        });
    },
    { tags: ["factory", "l2-suite", "main-suite"] },
);
