import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, namedAccounts }) => {
        const { deployer } = namedAccounts;

        await deploy("CreateCall", {
            account: deployer,
            artifact: artifacts.CreateCall,
            args: [],
        });

        await deploy("MultiSend", {
            account: deployer,
            artifact: artifacts.MultiSend,
            args: [],
        });

        await deploy("MultiSendCallOnly", {
            account: deployer,
            artifact: artifacts.MultiSendCallOnly,
            args: [],
        });

        await deploy("SignMessageLib", {
            account: deployer,
            artifact: artifacts.SignMessageLib,
            args: [],
        });

        await deploy("SafeToL2Setup", {
            account: deployer,
            artifact: artifacts.SafeToL2Setup,
            args: [],
        });
    },
    { tags: ["libraries", "l2-suite", "main-suite"] },
);
