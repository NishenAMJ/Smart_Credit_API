import { AiRoleRouterService } from './ai-role-router.service';
import type { AdminAiToolsService } from './admin-ai-tools.service';
import type { BorrowerAiToolsService } from './borrower-ai-tools.service';
import type { LenderAiToolsService } from './lender-ai-tools.service';

describe('AiRoleRouterService', () => {
  const borrowerDefinitionsMock = jest.fn(() => [{ name: 'borrower_tool' }]);
  const borrowerExecuteMock = jest.fn(() =>
    Promise.resolve({ role: 'borrower' }),
  );
  const lenderDefinitionsMock = jest.fn(() => [{ name: 'lender_tool' }]);
  const lenderExecuteMock = jest.fn(() => Promise.resolve({ role: 'lender' }));
  const adminDefinitionsMock = jest.fn(() => [{ name: 'admin_tool' }]);
  const adminExecuteMock = jest.fn(() => Promise.resolve({ role: 'admin' }));
  const borrowerTools = {
    getDefinitions: borrowerDefinitionsMock,
    execute: borrowerExecuteMock,
  } as unknown as BorrowerAiToolsService;
  const lenderTools = {
    getDefinitions: lenderDefinitionsMock,
    execute: lenderExecuteMock,
  } as unknown as LenderAiToolsService;
  const adminTools = {
    getDefinitions: adminDefinitionsMock,
    execute: adminExecuteMock,
  } as unknown as AdminAiToolsService;
  const router = new AiRoleRouterService(
    borrowerTools,
    lenderTools,
    adminTools,
  );

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
    expect(adminDefinitionsMock).not.toHaveBeenCalled();
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
    expect(adminExecuteMock).not.toHaveBeenCalled();
  });

  it('exposes only admin tools for an admin JWT', () => {
    const tools = router.getTools({
      sub: 'admin-1',
      email: 'a@example.com',
      role: 'admin',
    });

    expect(tools).toEqual([{ name: 'admin_tool' }]);
    expect(adminDefinitionsMock).toHaveBeenCalledTimes(1);
    expect(borrowerDefinitionsMock).not.toHaveBeenCalled();
    expect(lenderDefinitionsMock).not.toHaveBeenCalled();
  });

  it('executes admin tools with the admin identity from the JWT', async () => {
    await router.executeTool(
      { sub: 'admin-1', email: 'a@example.com', role: 'admin' },
      'get_admin_dashboard',
      {},
    );

    expect(adminExecuteMock).toHaveBeenCalledWith(
      'admin-1',
      'get_admin_dashboard',
      {},
    );
    expect(borrowerExecuteMock).not.toHaveBeenCalled();
    expect(lenderExecuteMock).not.toHaveBeenCalled();
  });
});
