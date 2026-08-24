import { useEffect, useState, type FormEvent } from "react";
import { CalendarRange, Download, X } from "lucide-react";
import { dateError } from "../../../lib/validation";

export type CsvDownload = {
  blob: Blob;
  fileName: string;
};

type DateRangeCsvExportProps = {
  title: string;
  description: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onExport: (startDate: string, endDate: string) => Promise<CsvDownload>;
  errorMessage: string;
};

function getSriLankaDateValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getDefaultStartDate(endDate: string): string {
  const date = new Date(`${endDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}

export default function DateRangeCsvExport({
  title,
  description,
  defaultStartDate,
  defaultEndDate,
  onExport,
  errorMessage,
}: DateRangeCsvExportProps) {
  const fallbackEndDate = getSriLankaDateValue();
  const resolvedEndDate = defaultEndDate ?? fallbackEndDate;
  const resolvedStartDate =
    defaultStartDate ?? getDefaultStartDate(resolvedEndDate);
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(resolvedStartDate);
  const [endDate, setEndDate] = useState(resolvedEndDate);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartDate(resolvedStartDate);
    setEndDate(resolvedEndDate);
    setError(null);
  }, [resolvedEndDate, resolvedStartDate]);

  async function handleExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startError = dateError(startDate, "Start date", { notFuture: true });
    const endError = dateError(endDate, "End date", { notFuture: true });
    if (startError || endError) {
      setError(startError ?? endError ?? "Select a valid date range.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const result = await onExport(startDate, endDate);
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setIsOpen(false);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : errorMessage,
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="payment-export">
      <button
        className="button button-secondary payment-export__trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setError(null);
        }}
      >
        <Download size={17} /> Export CSV
      </button>

      {isOpen ? (
        <form className="payment-export__panel" onSubmit={handleExport}>
          <div className="payment-export__header">
            <div>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
            <button
              type="button"
              className="payment-export__close"
              aria-label="Close export options"
              onClick={() => setIsOpen(false)}
            >
              <X size={17} />
            </button>
          </div>

          <div className="payment-export__dates">
            <label>
              <span>From</span>
              <div className="payment-export__date-input">
                <CalendarRange size={16} />
                <input
                  type="date"
                  max={fallbackEndDate}
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setError(null);
                  }}
                />
              </div>
            </label>
            <label>
              <span>To</span>
              <div className="payment-export__date-input">
                <CalendarRange size={16} />
                <input
                  type="date"
                  max={fallbackEndDate}
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setError(null);
                  }}
                />
              </div>
            </label>
          </div>

          {error ? <p className="payment-export__error">{error}</p> : null}

          <button
            className="button button-primary payment-export__download"
            type="submit"
            disabled={isExporting}
          >
            <Download size={17} />
            {isExporting ? "Preparing CSV..." : "Download CSV"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
