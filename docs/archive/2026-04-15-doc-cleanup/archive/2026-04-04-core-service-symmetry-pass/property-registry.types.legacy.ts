/**
 * Shared property definitions for the Property Registry.
 * Consumed by Sort, Grouping, Filter, and Search operators.
 */

/** The data type of a property — determines UI controls and valid operators. */
export type PropertyType = 'text' | 'select' | 'number' | 'date' | 'checkbox';

/** Which operators can use this property. */
export interface PropertyCapabilities {
  sortable: boolean;
  groupable: boolean;
  filterable: boolean;
  searchable: boolean;
}

/** A property definition in the registry — either built-in or custom. */
export interface PropertyDefinition {
  /** Unique identifier — slug for built-in, UUID for custom. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Material icon name. */
  icon: string;
  /** Property data type. */
  type: PropertyType;
  /** Which operators can use this property. */
  capabilities: PropertyCapabilities;
  /** Default sort direction when first activated. */
  defaultSortDirection: 'asc' | 'desc';
  /** True for built-in properties, false for custom. */
  builtIn: boolean;
}
