import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const deployAccessorsModule = buildModule("DeployAccessorsModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const simulateTxAccessor = m.contract("SimulateTxAccessor", [], {
        from: deployerAccount,
    });

    return { simulateTxAccessor };
});

const deployFactoriesModule = buildModule("DeployFactoriesModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const safeProxyFactory = m.contract("SafeProxyFactory", [], {
        from: deployerAccount,
    });

    return { safeProxyFactory };
});

const deployHandlersModule = buildModule("DeployHandlersModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const tokenCallbackHandler = m.contract("TokenCallbackHandler", [], {
        from: deployerAccount,
    });

    const compatibilityFallbackHandler = m.contract("CompatibilityFallbackHandler", [], {
        from: deployerAccount,
    });

    const extensibleFallbackHandler = m.contract("ExtensibleFallbackHandler", [], {
        from: deployerAccount,
    });

    return { tokenCallbackHandler, compatibilityFallbackHandler, extensibleFallbackHandler };
});

const deployLibrariesModule = buildModule("DeployLibrariesModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const createCall = m.contract("CreateCall", [], {
        from: deployerAccount,
    });

    const multiSend = m.contract("MultiSend", [], {
        from: deployerAccount,
    });

    const multiSendCallOnly = m.contract("MultiSendCallOnly", [], {
        from: deployerAccount,
    });

    const signMessageLib = m.contract("SignMessageLib", [], {
        from: deployerAccount,
    });

    const safeToL2Setup = m.contract("SafeToL2Setup", [], {
        from: deployerAccount,
    });

    return { createCall, multiSend, multiSendCallOnly, signMessageLib, safeToL2Setup };
});

const deploySafeSingletonModule = buildModule("DeploySafeSingletonModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const safe = m.contract("Safe", [], {
        from: deployerAccount,
    });

    return { safe };
});

const deploySafeL2Module = buildModule("DeploySafeL2Module", (m) => {
    const deployerAccount = m.getAccount(0);

    const safeL2 = m.contract("SafeL2", [], {
        from: deployerAccount,
    });

    return { safeL2 };
});

const deployMigrationsModule = buildModule("DeployMigrationsModule", (m) => {
    const deployerAccount = m.getAccount(0);

    const { safe } = m.useModule(deploySafeSingletonModule);
    const { safeL2 } = m.useModule(deploySafeL2Module);
    const { compatibilityFallbackHandler } = m.useModule(deployHandlersModule);

    const safeMigration = m.contract("SafeMigration", [safe, safeL2, compatibilityFallbackHandler], {
        from: deployerAccount,
    });

    return { safeMigration };
});

export default buildModule("SafeModule", (m) => {
    const { simulateTxAccessor } = m.useModule(deployAccessorsModule);
    const { safeProxyFactory } = m.useModule(deployFactoriesModule);
    const { tokenCallbackHandler, compatibilityFallbackHandler, extensibleFallbackHandler } = m.useModule(deployHandlersModule);
    const { createCall, multiSend, multiSendCallOnly, signMessageLib, safeToL2Setup } = m.useModule(deployLibrariesModule);
    const { safe } = m.useModule(deploySafeSingletonModule);
    const { safeL2 } = m.useModule(deploySafeL2Module);
    const { safeMigration } = m.useModule(deployMigrationsModule);

    return {
        simulateTxAccessor,
        safeProxyFactory,
        tokenCallbackHandler,
        compatibilityFallbackHandler,
        extensibleFallbackHandler,
        createCall,
        multiSend,
        multiSendCallOnly,
        signMessageLib,
        safeToL2Setup,
        safe,
        safeL2,
        safeMigration,
    };
});
