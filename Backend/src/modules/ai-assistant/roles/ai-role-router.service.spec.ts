import { ForbiddenException } from '@nestjs/common';
import { AiRoleRouterService } from './ai-role-router.service';
import type { BorrowerAiToolsService } from './borrower-ai-tools.service';
import type { LenderAiToolsService } from './lender-ai-tools.service';

describe('AiRoleRouterService', () => {
  const borrowerDefinitionsMock = jest.fn(() => [{ name: 'borrower_tool' }]);
  const borrowerExecuteMock = jest.fn(() =>
    Promise.resolve({ role: 'borrower' }),
  );
  const lenderDefinitionsMock = jest.fn(() => [{ name: 'lender_tool' }]);
  const lenderExecuteMock = jest.fn(() => Promise.resolve({ role: 'lender' }));
  const borrowerTools = {
    getDefinitions: borrowerDefinitionsMock,
    execute: borrowerExecuteMock,
  } as unknown as BorrowerAiToolsService;
  const lenderTools = {
    getDefinitions: lenderDefinitionsMock,
    execute: lenderExecuteMock,
  } as unknown as LenderAiToolsService;
  const router = new AiRoleRouterService(borrowerTools, lenderTools);

  beforeEach(() => jest.clearAllMocks());

  it('exposes only borrower tools for a borrower JWT', () => {
    const tools = router.getTools({
      sub: 'borrower-1',
      email: 'b@example.com',
      role: 'borrower',
    });

    expect(tools).toEqual([{ name: 'borrower_tool' }]);
    expect(borrowerDefinitionsMock).toHaveBeenCalledTimes(1);
    expect(lenderDefinitionsMock).not.toHaveBeenCalled();
  });

  it('executes lender tools with the lender identity from the JWT', async () => {
    await router.executeTool(
      { sub: 'lender-7', email: 'l@example.com', role: 'lender' },
      'list_lender_loans',
      {},
    );

    expect(lenderExecuteMock).toHaveBeenCalledWith(
      'lender-7',
      'list_lender_loans',
      {},
    );
    expect(borrowerExecuteMock).not.toHaveBeenCalled();
  });

  it('rejects admin identities', () => {
    expect(() =>
      router.getTools({
        sub: 'admin-1',
        email: 'a@example.com',
        role: 'admin',
      }),
    ).toThrow(ForbiddenException);
  });
});
