/**
 * Arquivo centralizador para exportações de serviços
 */

// Re-exportando funções do Supabase
export * from './supabase';

// Re-exportando funções de relatórios
export * from './reports';

// Re-exportando funções de utilidades de data do módulo dateUtils
import { isExpired, calculateDaysRemaining } from '../utils/dateUtils';
export { isExpired, calculateDaysRemaining }; 