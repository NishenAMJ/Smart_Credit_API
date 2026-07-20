import { fetchBorrowersCsv } from "../../lib/dashboard-api";
import DateRangeCsvExport from "../common/DateRangeCsvExport";

export default function BorrowerCsvExport() {
  return (
    <DateRangeCsvExport
      title="Export borrowers"
      description="Select when borrowers first joined your portfolio."
      onExport={fetchBorrowersCsv}
      errorMessage="Failed to export borrowers."
    />
  );
}
