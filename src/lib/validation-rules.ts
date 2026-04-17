import type { ValidationGroup } from '@/types/domain';

/**
 * @fileOverview Context-Aware Validation Logic.
 * Defines required, optional, and forbidden fields per asset category.
 */

export type FieldRule = 'required' | 'optional' | 'not_applicable' | 'forbidden';

export interface CategoryValidationRules {
  serialNumber: FieldRule;
  modelNumber: FieldRule;
  manufacturer: FieldRule;
  chassisNo: FieldRule;
  engineNo: FieldRule;
  assetIdCode: FieldRule;
}

export const VALIDATION_GROUPS: Record<ValidationGroup, CategoryValidationRules> = {
  electronics: {
    serialNumber: 'required',
    modelNumber: 'optional',
    manufacturer: 'optional',
    chassisNo: 'forbidden',
    engineNo: 'forbidden',
    assetIdCode: 'required',
  },
  vehicles: {
    serialNumber: 'not_applicable',
    modelNumber: 'not_applicable',
    manufacturer: 'optional',
    chassisNo: 'required',
    engineNo: 'required',
    assetIdCode: 'required',
  },
  furniture: {
    serialNumber: 'not_applicable',
    modelNumber: 'not_applicable',
    manufacturer: 'not_applicable',
    chassisNo: 'forbidden',
    engineNo: 'forbidden',
    assetIdCode: 'optional',
  },
  medical: {
    serialNumber: 'required',
    modelNumber: 'optional',
    manufacturer: 'optional',
    chassisNo: 'forbidden',
    engineNo: 'forbidden',
    assetIdCode: 'required',
  },
  infrastructure: {
    serialNumber: 'optional',
    modelNumber: 'optional',
    manufacturer: 'optional',
    chassisNo: 'forbidden',
    engineNo: 'forbidden',
    assetIdCode: 'required',
  },
  unknown: {
    serialNumber: 'optional',
    modelNumber: 'optional',
    manufacturer: 'optional',
    chassisNo: 'optional',
    engineNo: 'optional',
    assetIdCode: 'optional',
  }
};
