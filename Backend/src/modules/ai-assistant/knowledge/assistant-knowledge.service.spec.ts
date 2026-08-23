import { AssistantKnowledgeService } from './assistant-knowledge.service';

describe('AssistantKnowledgeService', () => {
  it('gives admins explicit read-only mutation restrictions', () => {
    const instructions = new AssistantKnowledgeService().buildInstructions(
      'admin',
    );

    expect(instructions).toContain(
      'sanitized, read-only operational summaries',
    );
    expect(instructions).toContain(
      'explicitly refuse requests to approve or reject',
    );
    expect(instructions).toContain('suspend or delete users');
    expect(instructions).toContain('resolve disputes');
  });
});
