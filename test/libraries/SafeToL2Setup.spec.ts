import { expect } from "chai";
import hre from "hardhat";
import { getFactory, getSafe, getSafeL2Singleton, getSafeSingleton, createFixture, getDeployment } from "../utils/setup.js";
import { sameHexString } from "../utils/strings.js";
import { executeContractCallWithSigners } from "../../src/index.js";
import { EXPECTED_SAFE_STORAGE_LAYOUT, getContractStorageLayout } from "../utils/storage.js";

const { ethers, provider, networkConfig } = await hre.network.getOrCreate();

type PrestateDiff = {
    pre: Record<string, { storage?: Record<string, string> }>;
    post: Record<string, { storage?: Record<string, string> }>;
};

describe("SafeToL2Setup", () => {
    const setupTests = createFixture(async () => {
        const safeToL2SetupAddress = (await getDeployment("SafeToL2Setup")).address;
        const safeToL2SetupLib = await ethers.getContractAt("SafeToL2Setup", safeToL2SetupAddress);
        const signers = await ethers.getSigners();
        const safeSingleton = await getSafeSingleton();
        const safeL2 = await getSafeL2Singleton();
        const proxyFactory = await getFactory();
        return {
            safeToL2SetupLib,
            signers,
            safeSingleton,
            safeL2,
            proxyFactory,
        };
    });

    describe("L2", () => {
        before(function () {
            if (networkConfig.chainId === 1) {
                this.skip();
            }
        });

        describe("setupToL2", () => {
            it("follows the expected storage layout", async () => {
                const safeStorageLayout = await getContractStorageLayout(hre, "SafeToL2Setup");

                expect(safeStorageLayout).to.deep.eq(EXPECTED_SAFE_STORAGE_LAYOUT);
            });

            it("should emit an event", async () => {
                const {
                    safeSingleton,
                    safeL2,
                    proxyFactory,
                    signers: [user1],
                    safeToL2SetupLib,
                } = await setupTests();
                const safeL2SingletonAddress = await safeL2.getAddress();
                const safeToL2SetupCall = safeToL2SetupLib.interface.encodeFunctionData("setupToL2", [safeL2SingletonAddress]);

                const setupData = safeL2.interface.encodeFunctionData("setup", [
                    [user1.address],
                    1,
                    safeToL2SetupLib.target,
                    safeToL2SetupCall,
                    ethers.ZeroAddress,
                    ethers.ZeroAddress,
                    0,
                    ethers.ZeroAddress,
                ]);
                const safeAddress = await proxyFactory.createProxyWithNonce.staticCall(safeSingleton.target, setupData, 0);

                await expect(proxyFactory.createProxyWithNonce(safeSingleton.target, setupData, 0))
                    .to.emit(safeToL2SetupLib.attach(safeAddress), "ChangedMasterCopy")
                    .withArgs(safeL2SingletonAddress);
            });

            it("only allows singleton address that contains code", async () => {
                const {
                    safeSingleton,
                    safeL2,
                    proxyFactory,
                    signers: [user1, user2],
                    safeToL2SetupLib,
                } = await setupTests();
                const safeToL2SetupCall = safeToL2SetupLib.interface.encodeFunctionData("setupToL2", [user2.address]);

                const setupData = safeL2.interface.encodeFunctionData("setup", [
                    [user1.address],
                    1,
                    safeToL2SetupLib.target,
                    safeToL2SetupCall,
                    ethers.ZeroAddress,
                    ethers.ZeroAddress,
                    0,
                    ethers.ZeroAddress,
                ]);

                // For some reason, hardhat can't infer the revert reason
                await expect(proxyFactory.createProxyWithNonce(safeSingleton.target, setupData, 0)).to.be.revert(ethers);
            });

            it("can be used only via DELEGATECALL opcode", async () => {
                const { safeToL2SetupLib } = await setupTests();
                const randomAddress = ethers.hexlify(ethers.randomBytes(20));

                await expect(safeToL2SetupLib.setupToL2(randomAddress)).to.be.rejectedWith(
                    "SafeToL2Setup should only be called via delegatecall",
                );
            });

            it("can only be used through Safe initialization process", async () => {
                const {
                    safeToL2SetupLib,
                    signers: [user1],
                } = await setupTests();
                const safe = await getSafe({ owners: [user1.address] });
                const safeToL2SetupLibAddress = await safeToL2SetupLib.getAddress();

                await expect(
                    executeContractCallWithSigners(safe, safeToL2SetupLib, "setupToL2", [safeToL2SetupLibAddress], [user1], true),
                ).to.be.rejectedWith("Safe must have not executed any tx");
            });

            it("changes the expected storage slot without touching the most important ones", async () => {
                const {
                    safeSingleton,
                    safeL2,
                    proxyFactory,
                    signers: [user1],
                    safeToL2SetupLib,
                } = await setupTests();

                const safeL2SingletonAddress = await safeL2.getAddress();
                const safeToL2SetupCall = safeToL2SetupLib.interface.encodeFunctionData("setupToL2", [safeL2SingletonAddress]);

                const encodeSetup = (to: string, data: string) =>
                    safeL2.interface.encodeFunctionData("setup", [
                        [user1.address],
                        1,
                        to,
                        data,
                        ethers.ZeroAddress,
                        ethers.ZeroAddress,
                        0,
                        ethers.ZeroAddress,
                    ]);

                // Deploy the same Safe twice — once with `SafeToL2Setup` as the setup delegatecall
                // target, once with no setup call at all — and compare the two storage diffs. What
                // differs between them is exactly what the library did, which is what this test is
                // about.
                //
                // Hardhat 2 got at this by walking `debug_traceTransaction` struct logs and reading
                // the per-step `storage` either side of the DELEGATECALL. Hardhat 3's tracer does
                // not report `storage` at any verbosity, so the diff comes from `prestateTracer`
                // instead, and the delegatecall is isolated by comparison rather than by finding it
                // in the opcode stream.
                const storageDiff = async (to: string, data: string) => {
                    const setupData = encodeSetup(to, data);
                    const address = await proxyFactory.createProxyWithNonce.staticCall(safeSingleton.target, setupData, 0);
                    const transaction = await (await proxyFactory.createProxyWithNonce(safeSingleton.target, setupData, 0)).wait();
                    if (!transaction?.hash) {
                        throw new Error("No transaction hash");
                    }
                    const diff = (await provider.send("debug_traceTransaction", [
                        transaction.hash,
                        { tracer: "prestateTracer", tracerConfig: { diffMode: true } },
                    ])) as PrestateDiff;
                    const account = Object.keys(diff.post).find((candidate) => sameHexString(candidate, address));
                    if (account === undefined) {
                        throw new Error(`No storage diff recorded for ${address}`);
                    }
                    return { address, storage: diff.post[account].storage ?? {} };
                };

                const withLibrary = await storageDiff(safeToL2SetupLib.target as string, safeToL2SetupCall);
                const withoutLibrary = await storageDiff(ethers.ZeroAddress, "0x");

                const singletonSlot = ethers.zeroPadValue("0x00", 32);

                // Apart from the singleton slot, every slot the library touched must hold what it
                // would have held without the library.
                for (const [slot, value] of Object.entries(withLibrary.storage)) {
                    if (sameHexString(slot, singletonSlot)) {
                        expect(sameHexString(value, ethers.zeroPadValue(safeL2SingletonAddress, 32))).to.be.true;
                    } else {
                        expect(
                            Object.entries(withoutLibrary.storage).some(
                                ([baseline, baselineValue]) => sameHexString(baseline, slot) && sameHexString(baselineValue, value),
                            ),
                            `slot ${slot} was changed by SafeToL2Setup`,
                        ).to.be.true;
                    }
                }

                // ...and it must not have skipped a slot the plain setup writes.
                for (const slot of Object.keys(withoutLibrary.storage)) {
                    if (sameHexString(slot, singletonSlot)) continue;
                    expect(
                        Object.keys(withLibrary.storage).some((candidate) => sameHexString(candidate, slot)),
                        `slot ${slot} was not written when SafeToL2Setup ran`,
                    ).to.be.true;
                }

                // Double-check that the storage slot was changed at the end of the transaction
                const singletonInStorage = await ethers.provider.getStorage(withLibrary.address, singletonSlot);
                expect(sameHexString(singletonInStorage, ethers.zeroPadValue(safeL2SingletonAddress, 32))).to.be.true;
            });
        });
    });

    describe("L1", () => {
        before(function () {
            if (networkConfig.chainId !== 1) {
                this.skip();
            }
        });

        it("should be a noop when the chain id is 1 [@L1]", async () => {
            const {
                safeSingleton,
                safeL2,
                proxyFactory,
                signers: [user1],
                safeToL2SetupLib,
            } = await setupTests();
            const safeSingletonAddress = await safeSingleton.getAddress();
            const safeL2SingletonAddress = await safeL2.getAddress();
            const safeToL2SetupCall = safeToL2SetupLib.interface.encodeFunctionData("setupToL2", [safeL2SingletonAddress]);

            const setupData = safeL2.interface.encodeFunctionData("setup", [
                [user1.address],
                1,
                safeToL2SetupLib.target,
                safeToL2SetupCall,
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                0,
                ethers.ZeroAddress,
            ]);
            const safeAddress = await proxyFactory.createProxyWithNonce.staticCall(safeSingleton.target, setupData, 0);

            await expect(proxyFactory.createProxyWithNonce(safeSingletonAddress, setupData, 0)).to.not.emit(
                safeToL2SetupLib.attach(safeAddress),
                "ChangedMasterCopy",
            );
            const singletonInStorage = await ethers.provider.getStorage(safeAddress, ethers.zeroPadValue("0x00", 32));
            expect(sameHexString(singletonInStorage, ethers.zeroPadValue(safeSingletonAddress, 32))).to.be.true;
        });
    });
});
