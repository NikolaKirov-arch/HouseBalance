export function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '-';
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00`
    : text.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
