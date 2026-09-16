import type { NewTaskActionFunction } from "hardhat/types/tasks";

const deployContracts: NewTaskActionFunction = async (_taskArgs, hre) => {
    await hre.tasks.getTask("deploy").run({});
    await hre.tasks.getTask("local-verify").run({});
    // `hardhat-verify` covers Etherscan and Sourcify, so the two separate steps this used to run
    // are one task now.
    await hre.tasks.getTask("verify").run({});
};

export default deployContracts;
