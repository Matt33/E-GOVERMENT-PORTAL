import { Injectable } from '@nestjs/common';

export interface NameValidationResult {
  status: 'ACCEPT' | 'REJECT';
  reason: string;
}

@Injectable()
export class GoRulesService {
  validateName(firstName: string, lastName: string): NameValidationResult {
    if (!firstName || firstName.trim() === '') {
      return { status: 'REJECT', reason: 'First name is required' };
    }
    if (!lastName || lastName.trim() === '') {
      return { status: 'REJECT', reason: 'Last name is required' };
    }
    return { status: 'ACCEPT', reason: 'Name is valid' };
  }
}
