import { expect } from "chai";
import hre from "hardhat";
import { getSafe, createFixture } from "../utils/setup.js";
import { AddressOne } from "../../src/utils/constants.js";

const { ethers } = await hre.network.getOrCreate();

describe("Safe - Reserved Addresses", () => {
    const setupTests = createFixture(async () => {
        const [user1] = await ethers.getSigners();
        return {
            safe: await getSafe({ owners: [user1.address] }),
        };
    });

    it("sentinels should not be owners or modules", async () => {
        const { safe } = await setupTests();
        const readOnlySafe = safe.connect(ethers.provider);

        expect(await safe.isOwner(AddressOne)).to.be.false;

        const sig =
            "0x" +
            "0000000000000000000000000000000000000000000000000000000000000001" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "01";
        await expect(
            readOnlySafe.execTransaction.staticCall(AddressOne, 0, "0x", 0, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, sig, {
                from: "0x0000000000000000000000000000000000000001",
            }),
            "Should not be able to execute transaction from sentinel as owner",
        ).to.be.revert(ethers);

        await expect(
            readOnlySafe.execTransactionFromModule.staticCall(AddressOne, 0, "0x", 0, {
                from: "0x0000000000000000000000000000000000000001",
            }),
            "Should not be able to execute transaction from sentinel as module",
        ).to.be.revert(ethers);
    });
});
