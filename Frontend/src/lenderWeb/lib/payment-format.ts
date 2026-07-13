export function formatInstallmentLabel(value: string | null): string {
  if (!value) return 'Not linked'
  const match = /^month_(\d+)$/i.exec(value)
  if (match) return `Installment ${Number(match[1])}`

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
