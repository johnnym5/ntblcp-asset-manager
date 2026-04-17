import { enqueueMutation } from '../queue';
import { storage } from '../storage';

jest.mock('../storage', () => ({
  storage: {
    enqueue: jest.fn().mockResolvedValue(undefined),
    getQueue: jest.fn().mockResolvedValue([])
  }
}));

describe('Offline Mutation Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a valid entry and call storage.enqueue', async () => {
    const payload = { description: 'New Asset' };
    const id = await enqueueMutation('CREATE', 'assets', payload);

    expect(id).toBeDefined();
    expect(storage.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      id,
      operation: 'CREATE',
      collection: 'assets',
      payload,
      status: 'PENDING'
    }));
  });

  it('should record the timestamp of enqueued operations', async () => {
    const payload = { description: 'Updated Asset' };
    await enqueueMutation('UPDATE', 'assets', payload);

    const callArgs = (storage.enqueue as jest.Mock).mock.calls[0][0];
    expect(callArgs.timestamp).toBeLessThanOrEqual(Date.now());
  });
});
