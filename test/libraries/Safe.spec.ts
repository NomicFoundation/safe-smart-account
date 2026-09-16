import hre from "hardhat";
import { expect } from "chai";
import { EXPECTED_SAFE_STORAGE_LAYOUT, getContractStorageLayout } from "../utils/storage.js";

describe("SafeStorage", () => {
    it("follows the expected storage layout", async () => {
        const safeStorageLayout = await getContractStorageLayout(hre, "SafeStorage");

        expect(safeStorageLayout).to.deep.eq(EXPECTED_SAFE_STORAGE_LAYOUT);
    });
});
