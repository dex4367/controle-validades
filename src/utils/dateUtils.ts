/**
 * Verifica se um produto está vencido
 * @param expiryDate Data de validade em formato string
 * @returns true se o produto estiver vencido, false caso contrário
 */
export function isExpired(expiryDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDate);
  return today > expDate;
}

/**
 * Calcula dias restantes até a data de validade
 * @param expiryDate Data de validade em formato string
 * @returns Número de dias restantes (negativo se já estiver vencido)
 */
export function calculateDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
} 