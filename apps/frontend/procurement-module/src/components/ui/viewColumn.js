import { createElement } from "react";
import ViewLink from "./ViewLink.jsx";

/**
 * Column definition shared by list tables whose last column is "View" (70px, 20px inset).
 * @param {string | ((row: any) => string)} recordType
 * @param {(row: any) => string | undefined} getId
 * @param {(row: any) => string | undefined} getNumber
 */
export function viewColumn(recordType, getId, getNumber, label = "View") {
  return {
    key: "view",
    header: label,
    width: "70px",
    headerClass: "pl-5",
    cellClass: "pl-5",
    render: (row) =>
      createElement(ViewLink, {
        recordType: typeof recordType === "function" ? recordType(row) : recordType,
        recordId: getId(row),
        documentNumber: getNumber(row),
        label,
      }),
  };
}
