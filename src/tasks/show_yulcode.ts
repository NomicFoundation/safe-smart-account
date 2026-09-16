import { readFile } from "node:fs/promises";

import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { loadSolc } from "../utils/solc.js";

interface YulcodeArguments {
    contractname: string;
}

const showYulCode: NewTaskActionFunction<YulcodeArguments> = async (taskArgs, hre) => {
    const contracts = await hre.artifacts.getAllFullyQualifiedNames();
    for (const contract of contracts) {
        if (taskArgs.contractname && !contract.endsWith(taskArgs.contractname)) continue;
        const buildInfoId = await hre.artifacts.getBuildInfoId(contract);
        if (buildInfoId === undefined) return;
        const buildInfoPath = await hre.artifacts.getBuildInfoPath(buildInfoId);
        if (buildInfoPath === undefined) return;
        const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"));
        buildInfo.input.settings.outputSelection["*"]["*"].push("ir", "evm.assembly");
        const solcjs = await loadSolc(buildInfo.solcLongVersion);
        const compiled = solcjs.compile(JSON.stringify(buildInfo.input));
        const output = JSON.parse(compiled);
        console.log(output.contracts[contract.split(":")[0]]);
        console.log(output.errors);
    }
};

export default showYulCode;
