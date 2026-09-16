import type { NewTaskActionFunction } from "hardhat/types/tasks";

interface CodesizeArguments {
    skipcompile: boolean;
    contractname: string;
}

const showCodesize: NewTaskActionFunction<CodesizeArguments> = async (taskArgs, hre) => {
    if (!taskArgs.skipcompile) {
        await hre.tasks.getTask("build").run({});
    }
    const contracts = await hre.artifacts.getAllFullyQualifiedNames();
    for (const contract of contracts) {
        const artifact = await hre.artifacts.readArtifact(contract);
        if (taskArgs.contractname && taskArgs.contractname !== artifact.contractName) continue;
        console.log(artifact.contractName, Math.max(0, (artifact.deployedBytecode.length - 2) / 2), "bytes (limit is 24576)");
    }
};

export default showCodesize;
