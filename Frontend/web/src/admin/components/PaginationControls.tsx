type PaginationControlsProps = {
  page: number;
  canGoBack: boolean;
  canGoNext: boolean;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function PaginationControls({
  page,
  canGoBack,
  canGoNext,
  loading = false,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 16,
      }}
    >
      <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
        Page {page}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn-secondary btn-sm"
          onClick={onPrevious}
          disabled={!canGoBack || loading}
        >
          Previous
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={onNext}
          disabled={!canGoNext || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
