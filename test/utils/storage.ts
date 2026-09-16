import { type HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";

type StateVariable = {
    name: string;
    slot: string;
    offset: number;
    type: string;
};

export const EXPECTED_SAFE_STORAGE_LAYOUT: StateVariable[] = [
    { name: "singleton", slot: "0", offset: 0, type: "t_address" },
    {
        name: "modules",
        slot: "1",
        offset: 0,
        type: "t_mapping(t_address,t_address)",
    },
    {
        name: "owners",
        slot: "2",
        offset: 0,
        type: "t_mapping(t_address,t_address)",
    },
    { name: "ownerCount", slot: "3", offset: 0, type: "t_uint256" },
    { name: "threshold", slot: "4", offset: 0, type: "t_uint256" },
    { name: "nonce", slot: "5", offset: 0, type: "t_uint256" },
    {
        name: "_deprecatedDomainSeparator",
        slot: "6",
        offset: 0,
        type: "t_bytes32",
    },
    {
        name: "signedMessages",
        slot: "7",
        offset: 0,
        type: "t_mapping(t_bytes32,t_uint256)",
    },
    {
        name: "approvedHashes",
        slot: "8",
        offset: 0,
        type: "t_mapping(t_address,t_mapping(t_bytes32,t_uint256))",
    },
];

export const getContractStorageLayout = async (hre: HardhatRuntimeEnvironment, smartContractName: string) => {
    const { sourceName, inputSourceName, contractName } = await hre.artifacts.readArtifact(smartContractName);
    // Hardhat 3 compiles under a source name of its own, which is what appears in the build info.
    const buildInfoSourceName = inputSourceName ?? sourceName;

    const stateVariables: StateVariable[] = [];

    // Build info is split in two in Hardhat 3 — the compiler input, and the output reached by id.
    for (const buildInfoId of await hre.artifacts.getAllBuildInfoIds()) {
        const outputPath = await hre.artifacts.getBuildInfoOutputPath(buildInfoId);
        if (outputPath === undefined) {
            continue;
        }
        const artifactJsonABI = JSON.parse(fs.readFileSync(outputPath).toString());

        const artifactIncludesStorageLayout = artifactJsonABI?.output?.contracts?.[buildInfoSourceName]?.[contractName]?.storageLayout;
        if (!artifactIncludesStorageLayout) {
            continue;
        }

        const contractStateVariablesFromArtifact =
            artifactJsonABI.output.contracts[buildInfoSourceName][contractName].storageLayout.storage;
        for (const stateVariable of contractStateVariablesFromArtifact) {
            stateVariables.push({
                name: stateVariable.label,
                slot: stateVariable.slot,
                offset: stateVariable.offset,
                type: stateVariable.type,
            });
        }

        // The same contract can be present in multiple artifacts; thus we break if we already got
        // storage layout once
        break;
    }

    return stateVariables;
};
