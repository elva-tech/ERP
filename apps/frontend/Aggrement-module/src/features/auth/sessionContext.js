import { createContext, useContext } from "react";

export const SessionContext = createContext({
  status: "loading",
  session: null,
  error: null,
  isMock: false,
  activeTenantId: "",
  switchMockTenant: () => {},
  reload: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

