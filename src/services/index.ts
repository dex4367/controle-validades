/**
 * Arquivo centralizador para exportações de serviços
 */

// Arquivo de reexportação dos serviços

// Exportando funções do Supabase
export * from './supabase';

// Exportando funções de relatórios
export * from './reports';

// Exportando funções de Open Food Facts
export * from './openFoodFacts';

// Re-exportando algumas funções úteis
import { isExpired, calculateDaysRemaining } from '../utils/dateUtils';
export { isExpired, calculateDaysRemaining }; 