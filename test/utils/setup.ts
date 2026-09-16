import hre from "hardhat";
import { Contract, type Signer } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import solc from "solc";
import { logGas } from "../../src/utils/execution.js";
import { safeContractUnderTest } from "./config.js";
import { getRandomIntAsString } from "./numbers.js";
import { type MockContract, type Safe, type SafeL2 } from "../../typechain-types/index.js";
import { loadAndExecuteDeploymentsFromFiles } from "../../rocketh/environment.js";

const { ethers } = await hre.network.getOrCreate();

type DeploymentEnvironment = Awaited<ReturnType<typeof loadAndExecuteDeploymentsFromFiles>>;

/**
 * The deployments belonging to the fixture currently in scope. v1 hung these off the Hardhat
 * runtime environment; v2 returns them from the run, so the fixture puts them here for the `get*`
 * helpers below to read.
 */
let deploymentEnvironment: DeploymentEnvironment | undefined;

export const getDeployment = async (name: string) => {
    if (deploymentEnvironment === undefined) {
        throw new Error(`No deployments available: "${name}" was requested outside of a createFixture() setup.`);
    }
    const deployment = deploymentEnvironment.get(name);

    // v1 handed back checksummed addresses. rocketh stores them lowercase, and the tests compare
    // them against values read back out of contracts, which ethers always checksums — so
    // re-checksum here rather than at every comparison.
    return { ...deployment, address: ethers.getAddress(deployment.address) };
};

/**
 * Replaces `deployments.createFixture()`. Runs every deploy script, then the caller's setup, and
 * snapshots the result so that each test starts from the same chain state.
 */
export const createFixture = <T>(setup: () => Promise<T>): (() => Promise<T>) => {
    const fixture = async () => {
        const { provider } = await hre.network.getOrCreate();
        deploymentEnvironment = await loadAndExecuteDeploymentsFromFiles({ provider });
        return setup();
    };

    return async () => {
        const { networkHelpers } = await hre.network.getOrCreate();
        return networkHelpers.loadFixture(fixture);
    };
};

type SafeSingleton = {
    readonly singleton?: Safe | SafeL2;
};

type SafeWithSetupConfig = {
    readonly owners: string[];
    readonly threshold?: number;
    readonly to?: string;
    readonly data?: string;
    readonly fallbackHandler?: string;
    readonly saltNumber?: string;
};

type LogGas = {
    readonly logGasUsage?: boolean;
};

type GetSafeParameters = SafeSingleton & SafeWithSetupConfig & LogGas;

export const defaultTokenCallbackHandlerDeployment = async () => {
    return getDeployment("TokenCallbackHandler");
};

export const getSafeSingleton = async () => {
    const safeContractName = safeContractUnderTest();
    const { address } = await getDeployment(safeContractName);
    const safe = await ethers.getContractAt(safeContractName, address);
    return safe as unknown as Safe | SafeL2;
};

export const getSafeL1Singleton = async (): Promise<Safe> => {
    const safeSingletonDeployment = await getDeployment("Safe");
    const Safe = await ethers.getContractAt("Safe", safeSingletonDeployment.address);
    return Safe;
};

export const getSafeL2Singleton = async (): Promise<SafeL2> => {
    const safeSingletonDeployment = await getDeployment("SafeL2");
    const Safe = await ethers.getContractAt("SafeL2", safeSingletonDeployment.address);
    return Safe;
};

export const getSafeSingletonAt = async (address: string) => {
    const safe = await ethers.getContractAt(safeContractUnderTest(), address);
    return safe as unknown as Safe | SafeL2;
};

export const getFactory = async (address?: string) => {
    if (!address) {
        const factoryDeployment = await getDeployment("SafeProxyFactory");
        address = factoryDeployment.address;
    }

    const Factory = await ethers.getContractAt("SafeProxyFactory", address);
    return Factory;
};

export const getSimulateTxAccessor = async () => {
    const SimulateTxAccessor = await ethers.getContractAt("SimulateTxAccessor", (await getDeployment("SimulateTxAccessor")).address);
    return SimulateTxAccessor;
};

export const getMultiSend = async () => {
    const MultiSend = await ethers.getContractAt("MultiSend", (await getDeployment("MultiSend")).address);
    return MultiSend;
};

export const getMultiSendCallOnly = async () => {
    const MultiSend = await ethers.getContractAt("MultiSendCallOnly", (await getDeployment("MultiSendCallOnly")).address);
    return MultiSend;
};

export const getCreateCall = async () => {
    const CreateCall = await ethers.getContractAt("CreateCall", (await getDeployment("CreateCall")).address);
    return CreateCall;
};

export const migrationContractFactory = async () => {
    return await ethers.getContractFactory("Migration");
};

export const safeMigrationContract = async () => {
    const safeMigration = await ethers.getContractAt("SafeMigration", (await getDeployment("SafeMigration")).address);
    return safeMigration;
};

export const getMock = async (): Promise<MockContract> => {
    const contractFactory = await ethers.getContractFactory("MockContract");
    const contract = await contractFactory.deploy();

    return contract;
};

export const getSafeTemplate = async (saltNumber: string = getRandomIntAsString()) => {
    const singleton = await getSafeSingleton();
    return getSafeTemplateWithSingleton(singleton, saltNumber);
};

export const getSafeTemplateWithSingleton = async (singleton: Contract | Safe, saltNumber: string = getRandomIntAsString()) => {
    const singletonAddress = await singleton.getAddress();
    const factory = await getFactory();
    const template = await factory.createProxyWithNonce.staticCall(singletonAddress, "0x", saltNumber);
    await factory.createProxyWithNonce(singletonAddress, "0x", saltNumber).then((tx) => tx.wait());
    return singleton.attach(template) as Safe | SafeL2;
};

export const getEip7702SafeTemplate = async (authority: Signer) => {
    const singleton = await getSafeSingleton();
    return getEip7702SafeTemplateWithSingleton(singleton, authority);
};

export const getEip7702SafeTemplateWithSingleton = async (singleton: Safe | SafeL2 | Contract, authority: Signer) => {
    // Note that this process is UNSAFE and only used for testing. If used in the real world, your Safe setup can be
    // front-run by anyone and created with different parameters than you intended.
    const authorization = await authority.authorize({
        address: await singleton.getAddress(),
        // Since we are using the authority to set the delegation on itself, we need to sign it for the subsequent
        // nonce, as the current one is used for the transaction execution.
        nonce: (await ethers.provider.getTransactionCount(authority)) + 1,
    });
    const delegation = await authority.sendTransaction({ to: authority, authorizationList: [authorization] });
    await delegation.wait();
    return singleton.attach(await authority.getAddress()) as Safe | SafeL2;
};

export const getSafe = async (safe: GetSafeParameters) => {
    const {
        singleton = await getSafeSingleton(),
        owners,
        threshold = owners.length,
        to = AddressZero,
        data = "0x",
        fallbackHandler = AddressZero,
        logGasUsage = false,
        saltNumber = getRandomIntAsString(),
    } = safe;

    const template = await getSafeTemplateWithSingleton(singleton, saltNumber);
    await logGas(
        `Setup Safe with ${owners.length} owner(s)${fallbackHandler && fallbackHandler !== AddressZero ? " and fallback handler" : ""}`,
        template.setup(owners, threshold, to, data, fallbackHandler, AddressZero, 0, AddressZero),
        !logGasUsage,
    );
    return template;
};

export const getEip7702Safe = async (authority: Signer, safe: GetSafeParameters) => {
    const {
        singleton = await getSafeSingleton(),
        owners,
        threshold = owners.length,
        to = AddressZero,
        data = "0x",
        fallbackHandler = AddressZero,
        logGasUsage = false,
    } = safe;

    const template = await getEip7702SafeTemplateWithSingleton(singleton, authority);
    await logGas(
        `Setup EIP-7702 delegated Safe with ${owners.length} owner(s)${fallbackHandler && fallbackHandler !== AddressZero ? " and fallback handler" : ""}`,
        template.setup(owners, threshold, to, data, fallbackHandler, AddressZero, 0, AddressZero),
        !logGasUsage,
    );
    return template;
};

export const getTokenCallbackHandler = async (address?: string) => {
    if (!address) {
        const tokenCallbackHandlerDeployment = await defaultTokenCallbackHandlerDeployment();
        address = tokenCallbackHandlerDeployment.address;
    }

    const tokenCallbackHandler = await ethers.getContractAt("TokenCallbackHandler", address);
    return tokenCallbackHandler;
};

export const getCompatFallbackHandler = async (address?: string) => {
    if (!address) {
        const fallbackHandlerDeployment = await getDeployment("CompatibilityFallbackHandler");
        address = fallbackHandlerDeployment.address;
    }

    const fallbackHandler = await ethers.getContractAt("CompatibilityFallbackHandler", address);

    return fallbackHandler;
};

export const getExtensibleFallbackHandler = async (address?: string) => {
    if (!address) {
        const extensibleFallbackHandlerAddress = await getDeployment("ExtensibleFallbackHandler");
        address = extensibleFallbackHandlerAddress.address;
    }

    const extensibleFallbackHandler = await ethers.getContractAt("ExtensibleFallbackHandler", address);

    return extensibleFallbackHandler;
};

export const getSafeProxyRuntimeCode = async (): Promise<string> => {
    const proxyArtifact = await hre.artifacts.readArtifact("SafeProxy");

    return proxyArtifact.deployedBytecode;
};

export const getDelegateCaller = async () => {
    const DelegateCaller = await ethers.getContractFactory("DelegateCaller");
    return await DelegateCaller.deploy();
};

export const compile = async (source: string) => {
    const input = JSON.stringify({
        language: "Solidity",
        settings: {
            outputSelection: {
                "*": {
                    "*": ["abi", "evm.bytecode"],
                },
            },
        },
        sources: {
            "tmp.sol": {
                content: source,
            },
        },
    });
    const solcData = await solc.compile(input);
    const output = JSON.parse(solcData);
    if (!output["contracts"]) {
        console.log(output);
        throw Error("Could not compile contract");
    }
    const fileOutput = output["contracts"]["tmp.sol"];

    // Find the first contract with bytecode in the output, this allows the
    // compiled code to include interfaces.
    for (const contract in fileOutput) {
        const contractOutput = fileOutput[contract];
        if (!contractOutput["evm"]["bytecode"] || !contractOutput["evm"]["bytecode"]["object"]) {
            continue;
        }

        const abi = contractOutput["abi"];
        const data = "0x" + contractOutput["evm"]["bytecode"]["object"];
        return {
            data,
            interface: abi,
        };
    }

    console.log(output);
    throw Error("No contract with bytecode");
};

export const deployContractFromSource = async (deployer: Signer, source: string): Promise<Contract> => {
    const output = await compile(source);
    const transaction = await deployer.sendTransaction({ data: output.data, gasLimit: 6000000 });
    const receipt = await transaction.wait();

    if (!receipt?.contractAddress) {
        throw Error("Could not deploy contract");
    }

    return new Contract(receipt.contractAddress, output.interface, deployer);
};

export const getSignMessageLib = async () => {
    const SignMessageLibDeployment = await getDeployment("SignMessageLib");
    const SignMessageLib = await ethers.getContractAt("SignMessageLib", SignMessageLibDeployment.address);

    return SignMessageLib;
};

export const getAbi = async (name: string) => {
    const artifact = await hre.artifacts.readArtifact(name);
    if (!artifact) {
        throw Error(`Could not read artifact for ${name}`);
    }

    return artifact.abi;
};
