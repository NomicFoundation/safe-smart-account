import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("TokenCallbackHandler", {
            account: deployer,
            artifact: artifacts.TokenCallbackHandler,
            args: [],
        });

        await deploy("CompatibilityFallbackHandler", {
            account: deployer,
            artifact: artifacts.CompatibilityFallbackHandler,
            args: [],
        });

        await deploy("ExtensibleFallbackHandler", {
            account: deployer,
            artifact: artifacts.ExtensibleFallbackHandler,
            args: [],
        });
    },
    { tags: ["handlers", "l2-suite", "main-suite"] },
);
