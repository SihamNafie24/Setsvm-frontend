import { TSS_SERVER_FUNCTION } from "@tanstack/start-client-core";
const createServerRpc = (functionId, splitImportFn) => {
  const url = process.env.TSS_SERVER_FN_BASE + functionId;
  return Object.assign(splitImportFn, {
    url,
    functionId,
    [TSS_SERVER_FUNCTION]: true
  });
};
export {
  createServerRpc
};
//# sourceMappingURL=createServerRpc.js.map
