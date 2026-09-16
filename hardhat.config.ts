import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";
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
    plugins: [hardhatToolboxMochaEthers],
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
        compilers: [
            { version: SOLIDITY_VERSION ?? DEFAULT_SOLIDITY_VERSION, settings: soliditySettings },
            { version: DEFAULT_SOLIDITY_VERSION },
        ],
    },
    networks: {
        default: {
            type: "edr-simulated",
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
