import { artifacts, deployScript } from "../../rocketh/deploy.js";

export default deployScript(
    async ({ deploy, get, namedAccounts }) => {
        const { deployer } = namedAccounts;

        const safe = get("Safe");
        const safeL2 = get("SafeL2");
        const compatibilityFallbackHandler = get("CompatibilityFallbackHandler");

        await deploy("SafeMigration", {
            account: deployer,
            artifact: artifacts.SafeMigration,
            args: [safe.address, safeL2.address, compatibilityFallbackHandler.address],
        });
    },
    { tags: ["not-l2-to-l2-migration", "migration"], dependencies: ["singleton", "l2", "handlers"] },
);
