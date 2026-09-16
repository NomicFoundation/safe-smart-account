import type { UserConfig } from "rocketh/types";

export const config = {
    // The deploy scripts stay where they have always been; rocketh looks in `deploy/` by default.
    scripts: "src/deploy",
    accounts: {
        deployer: {
            default: 0,
        },
    },
    data: {},
} as const satisfies UserConfig;

// The extensions the deploy scripts and tests draw on. rocketh keeps its core minimal and takes
// everything else as a module, so the set has to be named rather than assumed.
import * as deployExtension from "@rocketh/deploy";
import * as readExecuteExtension from "@rocketh/read-execute";

const extensions = {
    ...deployExtension,
    ...readExecuteExtension,
};
export { extensions };

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;

export type { Accounts, Data, Extensions };
