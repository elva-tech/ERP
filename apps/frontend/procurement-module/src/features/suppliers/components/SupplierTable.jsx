import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText } from "../../../lib/formatters.js";
import SupplierStatusToggle from "./SupplierStatusToggle.jsx";

function SupplierTable({ suppliers, resource, onRequestStatusChange }) {
  const columns = [
    { key: "code", header: "Code", width: "100px", cellClass: "font-bold text-navy", render: (s) => displayText(s.code) },
    { key: "name", header: "Supplier Name", width: "180px", cellClass: "font-semibold text-ink", render: (s) => displayText(s.name) },
    { key: "category", header: "Category", width: "110px", render: (s) => displayText(s.categoryName) },
    { key: "gstin", header: "GST Number", width: "140px", render: (s) => displayText(s.gstin) },
    { key: "contactPerson", header: "Contact Person", width: "130px", cellClass: "text-ink", render: (s) => displayText(s.contactPerson) },
    { key: "phone", header: "Phone", width: "110px", render: (s) => displayText(s.phone) },
    { key: "city", header: "City", render: (s) => displayText(s.city) },
    {
      key: "status",
      header: "Status",
      width: "100px",
      align: "right",
      render: (supplier) => (
        <SupplierStatusToggle supplier={supplier} onRequestChange={() => onRequestStatusChange(supplier)} />
      ),
    },
  ];

  return (
    <DataTable
      caption="Suppliers"
      columns={columns}
      rows={suppliers}
      getRowKey={(supplier) => supplier.id}
      resource={resource}
      emptyTitle="No suppliers found"
      emptyMessage="No suppliers match the selected filters."
    />
  );
}

export default SupplierTable;
