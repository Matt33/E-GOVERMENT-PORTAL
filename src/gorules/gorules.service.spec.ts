import { GoRulesService } from './gorules.service';

describe('GoRulesService', () => {
  let service: GoRulesService;

  beforeEach(() => {
    service = new GoRulesService();
  });

  it('R-01: should reject empty first name', async () => {
    jest.spyOn(service as any, 'validateName').mockResolvedValue({
      status: 'REJECT',
      reason: 'First name is required',
    });
    const result = await service.validateName('', 'Doe');
    expect(result.status).toBe('REJECT');
  });

  it('R-06: should accept valid name', async () => {
    jest
      .spyOn(service as any, 'validateName')
      .mockResolvedValue({ status: 'ACCEPT', reason: 'Name is valid' });
    const result = await service.validateName('John', 'Doe');
    expect(result.status).toBe('ACCEPT');
  });
});
