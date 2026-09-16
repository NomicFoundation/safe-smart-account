import { expect } from "chai";
import hre from "hardhat";
import { AddressZero } from "@ethersproject/constants";
import { getSafeTemplate, createFixture } from "../utils/setup.js";

const { ethers } = await hre.network.getOrCreate();

describe("HandlerContext", () => {
    const setup = createFixture(async () => {
        const TestHandler = await ethers.getContractFactory("TestHandler");
        const handler = await TestHandler.deploy();
        const signers = await ethers.getSigners();
        return {
            safe: await getSafeTemplate(),
            handler,
            signers,
        };
    });

    it("parses information correctly", async () => {
        const {
            handler,
            signers: [user1, user2],
        } = await setup();
        const handlerAddress = await handler.getAddress();

        const response = await user1.call({
            to: handlerAddress,
            data: handler.interface.encodeFunctionData("dudududu") + user2.address.slice(2),
        });
        expect(handler.interface.decodeFunctionResult("dudududu", response)).to.be.deep.eq([user2.address, user1.address]);
    });

    it("works with the Safe", async () => {
        const {
            safe,
            handler,
            signers: [user1, user2],
        } = await setup();
        const handlerAddress = await handler.getAddress();
        const safeAddress = await safe.getAddress();
        await safe.setup([user1.address, user2.address], 1, AddressZero, "0x", handlerAddress, AddressZero, 0, AddressZero);

        const response = await user1.call({
            to: safeAddress,
            data: handler.interface.encodeFunctionData("dudududu"),
        });

        expect(handler.interface.decodeFunctionResult("dudududu", response)).to.be.deep.eq([user1.address, safeAddress]);
    });

    it("reverts if calldata is less than 20 bytes", async () => {
        const {
            handler,
            signers: [user1],
        } = await setup();

        const handlerAddress = await handler.getAddress();
        await expect(
            user1.call({
                to: handlerAddress,
                data: handler.interface.encodeFunctionData("dudududu"),
            }),
        ).to.be.revertedWith("Invalid calldata length");
    });
});
