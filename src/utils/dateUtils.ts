/**
 * Verifica se um produto está vencido
 */
export function isExpired(expiryDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDate);
  return today > expDate;
}

/**
 * Calcula dias restantes até a data de validade
 */
export function calculateDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
} 