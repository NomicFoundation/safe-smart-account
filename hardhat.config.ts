import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatDeploy from "hardhat-deploy";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
const { NODE_URL, INFURA_KEY, PK, SOLIDITY_VERSION, SOLIDITY_SETTINGS, HARDHAT_CHAIN_ID } = process.env;

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const DEFAULT_SOLIDITY_VERSION = "0.7.6";

const soliditySettings = SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined;

// Which credential to sign with is a choice made when the config loads; the credential itself is
// resolved lazily, so an unset variable only matters once a network is actually used.
const accounts = PK
    ? [configVariable("PK")]
    : { mnemonic: configVariable("MNEMONIC", { default: DEFAULT_MNEMONIC }) };

const sharedNetworkConfig = { type: "http", chainType: "l1", accounts } as const;

export default defineConfig({
    plugins: [hardhatToolboxMochaEthers, hardhatDeploy],
    paths: {
        artifacts: "build/artifacts",
        cache: "build/cache",
        sources: {
            solidity: ["contracts"],
        },
    },
    typechain: {
        outDir: "typechain-types",
    },
    solidity: {
        // `MockContract` is only ever used by the tests and comes from an npm package rather than
        // this repository, so it has to be named for Hardhat to build it and TypeChain to type it.
        npmFilesToBuild: ["@safe-global/mock-contract/contracts/MockContract.sol"],
        compilers: [
            { version: SOLIDITY_VERSION ?? DEFAULT_SOLIDITY_VERSION, settings: soliditySettings },
            { version: DEFAULT_SOLIDITY_VERSION },
        ],
    },
    networks: {
        default: {
            type: "edr-simulated",
            // Hardhat 2 ran this suite on a pre-Osaka hardfork. Hardhat 3 defaults to Osaka, which
            // would quietly change what the EVM supports underneath every test — notably by enabling
            // the secp256r1 precompile that `checkSignatures` has tests either side of. Pin it, so
            // moving forks is a deliberate change rather than a side effect of a new default.
            hardfork: "prague",
            allowUnlimitedContractSize: true,
            blockGasLimit: 100000000,
            gas: 100000000,
            chainId: Number(HARDHAT_CHAIN_ID ?? 31337),
        },
        mainnet: {
            ...sharedNetworkConfig,
            url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
        },
        sepolia: {
            ...sharedNetworkConfig,
            url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
        },
        gnosis: {
            ...sharedNetworkConfig,
            url: "https://rpc.gnosischain.com",
        },
        zksync: {
            ...sharedNetworkConfig,
            url: "https://mainnet.era.zksync.io",
        },
        // As in Hardhat 2, `custom` only exists when NODE_URL names one: an empty URL is not a
        // valid network, and Hardhat 3 rejects the config outright rather than at point of use.
        ...(NODE_URL
            ? {
                  custom: {
                      ...sharedNetworkConfig,
                      url: NODE_URL,
                  },
              }
            : {}),
    },
    test: {
        mocha: {
            timeout: 2000000,
        },
    },
    verify: {
        etherscan: {
            apiKey: configVariable("ETHERSCAN_API_KEY"),
        },
    },
});
