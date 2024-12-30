/**
 * @fileoverview Defines foundational interfaces that provide essential tracking and 
 * identification properties for all entities in the Egyptian Map of Pi backend services.
 * These interfaces ensure consistent entity structure, audit trail capabilities, and 
 * MongoDB compatibility across the entire system.
 */

/**
 * Core interface that defines essential tracking and identification properties 
 * required by all entities in the system.
 * 
 * @interface BaseEntity
 * @property {string} id - Unique identifier for the entity
 * @property {Date} createdAt - Timestamp when the entity was created
 * @property {Date} updatedAt - Timestamp when the entity was last updated
 * @property {boolean} isActive - Flag indicating if the entity is active or soft-deleted
 */
export interface BaseEntity {
  /**
   * Unique identifier for the entity
   */
  id: string;

  /**
   * Timestamp when the entity was created
   */
  createdAt: Date;

  /**
   * Timestamp when the entity was last updated
   */
  updatedAt: Date;

  /**
   * Flag indicating if the entity is active (true) or soft-deleted (false)
   * Used for implementing soft delete pattern across the system
   */
  isActive: boolean;
}

/**
 * MongoDB-specific document interface that extends BaseEntity to ensure 
 * database compatibility while maintaining type safety.
 * This interface should be used when defining MongoDB document types.
 * 
 * @interface BaseDocument
 * @extends {BaseEntity}
 */
export interface BaseDocument extends BaseEntity {
  /**
   * MongoDB document identifier
   * Inherits id from BaseEntity but explicitly defined for clarity
   */
  id: string;

  /**
   * Creation timestamp
   * Inherits createdAt from BaseEntity but explicitly defined for clarity
   */
  createdAt: Date;

  /**
   * Last update timestamp
   * Inherits updatedAt from BaseEntity but explicitly defined for clarity
   */
  updatedAt: Date;

  /**
   * Active status flag
   * Inherits isActive from BaseEntity but explicitly defined for clarity
   */
  isActive: boolean;
}