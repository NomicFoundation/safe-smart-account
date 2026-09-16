import { setupBenchmarkContracts } from "./utils/setup.js";

const contractSetup = setupBenchmarkContracts(undefined, true);
describe("Safe", () => {
    it("creation", async () => {
        await contractSetup();
    });
});
