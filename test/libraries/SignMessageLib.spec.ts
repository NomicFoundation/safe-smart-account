import { expect } from "chai";
import hre from "hardhat";
import { getSafe, getSignMessageLib, createFixture } from "../utils/setup.js";
import { executeContractCallWithSigners, calculateSafeMessageHash } from "../../src/utils/execution.js";
import { chainId } from "../utils/encoding.js";

const { ethers } = await hre.network.getOrCreate();

describe("SignMessageLib", () => {
    const setupTests = createFixture(async () => {
        const lib = await getSignMessageLib();
        const signers = await ethers.getSigners();
        const [user1, user2] = signers;
        return {
            safe: await getSafe({ owners: [user1.address, user2.address] }),
            lib,
            signers,
        };
    });

    describe("signMessage", () => {
        it("can only if msg.sender provides domain separator", async () => {
            const { lib } = await setupTests();
            await expect(lib.signMessage("0xbaddad")).to.be.revert(ethers);
        });

        it("should emit event", async () => {
            const {
                safe,
                lib,
                signers: [user1, user2],
            } = await setupTests();
            const safeAddress = await safe.getAddress();
            // Required to check that the event was emitted from the right address
            const libSafe = lib.attach(safeAddress);
            const messageHash = calculateSafeMessageHash(safeAddress, "0xbaddad", await chainId());

            expect(await safe.signedMessages(messageHash)).to.be.eq(0);

            await expect(executeContractCallWithSigners(safe, lib, "signMessage", ["0xbaddad"], [user1, user2], true))
                .to.emit(libSafe, "SignMsg")
                .withArgs(messageHash);

            expect(await safe.signedMessages(messageHash)).to.be.eq(1);
        });

        it("can be used only via DELEGATECALL opcode", async () => {
            const { lib } = await setupTests();

            // ethers v6 throws instead of reverting
            await expect(lib.signMessage("0xbaddad")).to.be.rejectedWith(
                "function selector was not recognized and there's no fallback function",
            );
        });

        it("changes the expected storage slot without touching the most important ones", async () => {
            const {
                safe,
                lib,
                signers: [user1, user2],
            } = await setupTests();

            const safeAddress = await safe.getAddress();
            const SIGNED_MESSAGES_MAPPING_STORAGE_SLOT = 7;
            const message = "no rugpull, funds must be safu";
            const eip191MessageHash = ethers.hashMessage(message);
            const safeInternalMsgHash = calculateSafeMessageHash(safeAddress, ethers.hashMessage(message), await chainId());
            const expectedStorageSlot = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["bytes32", "uint256"],
                    [safeInternalMsgHash, SIGNED_MESSAGES_MAPPING_STORAGE_SLOT],
                ),
            );

            const masterCopyAddressBeforeSigning = await ethers.provider.getStorage(await safe.getAddress(), 0);
            const ownerCountBeforeSigning = await ethers.provider.getStorage(await safe.getAddress(), 3);
            const thresholdBeforeSigning = await ethers.provider.getStorage(await safe.getAddress(), 4);
            const nonceBeforeSigning = await ethers.provider.getStorage(await safe.getAddress(), 5);
            const msgStorageSlotBeforeSigning = await ethers.provider.getStorage(await safe.getAddress(), expectedStorageSlot);

            expect(nonceBeforeSigning).to.be.eq(`0x${"0".padStart(64, "0")}`);
            expect(await safe.signedMessages(safeInternalMsgHash)).to.be.eq(0);
            expect(msgStorageSlotBeforeSigning).to.be.eq(`0x${"0".padStart(64, "0")}`);

            await executeContractCallWithSigners(safe, lib, "signMessage", [eip191MessageHash], [user1, user2], true);

            const masterCopyAddressAfterSigning = await ethers.provider.getStorage(await safe.getAddress(), 0);
            const ownerCountAfterSigning = await ethers.provider.getStorage(await safe.getAddress(), 3);
            const thresholdAfterSigning = await ethers.provider.getStorage(await safe.getAddress(), 4);
            const nonceAfterSigning = await ethers.provider.getStorage(await safe.getAddress(), 5);
            const msgStorageSlotAfterSigning = await ethers.provider.getStorage(await safe.getAddress(), expectedStorageSlot);

            expect(await safe.signedMessages(safeInternalMsgHash)).to.be.eq(1);
            expect(masterCopyAddressBeforeSigning).to.be.eq(masterCopyAddressAfterSigning);
            expect(thresholdBeforeSigning).to.be.eq(thresholdAfterSigning);
            expect(ownerCountBeforeSigning).to.be.eq(ownerCountAfterSigning);
            expect(nonceAfterSigning).to.be.eq(`0x${"1".padStart(64, "0")}`);
            expect(msgStorageSlotAfterSigning).to.be.eq(`0x${"1".padStart(64, "0")}`);
        });
    });
});
