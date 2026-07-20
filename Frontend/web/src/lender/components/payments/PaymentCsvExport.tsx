import { fetchPaymentsCsv } from "../../lib/recent-transactions-api";
import DateRangeCsvExport from "../common/DateRangeCsvExport";

type PaymentCsvExportProps = {
  defaultStartDate?: string;
  defaultEndDate?: string;
};

export default function PaymentCsvExport({
  defaultStartDate,
  defaultEndDate,
}: PaymentCsvExportProps) {
  return (
    <DateRangeCsvExport
      title="Export payments"
      description="Select a collection date range."
      defaultStartDate={defaultStartDate}
      defaultEndDate={defaultEndDate}
      onExport={fetchPaymentsCsv}
      errorMessage="Failed to export payments."
    />
  );
}
