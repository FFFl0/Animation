import { reasonOf } from '../shopApi';

/**
 * supabase-js collapses every non-2xx answer into one error and leaves the
 * Response itself in `context`. Everything the shop function says about why
 * it refused — not enough points, this receipt was rejected, the store is
 * not set up — is in that body, and is lost unless it is read back.
 */
describe('reading the reason out of a refusal', () => {
  it('finds the reason the function gave', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'notEnoughPoints' }), { status: 409 }) };
    await expect(reasonOf(error)).resolves.toBe('notEnoughPoints');
  });

  it('finds it on a rejected receipt too', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'receiptRejected' }), { status: 403 }) };
    await expect(reasonOf(error)).resolves.toBe('receiptRejected');
  });

  it('leaves the body readable for anybody else', async () => {
    const response = new Response(JSON.stringify({ error: 'claimFailed' }), { status: 409 });
    await expect(reasonOf({ context: response })).resolves.toBe('claimFailed');
    // The clone is what makes this safe: the original is still unread.
    expect(response.bodyUsed).toBe(false);
  });

  it('calls a body it cannot read a network problem', async () => {
    await expect(reasonOf({ context: new Response('<html>502</html>', { status: 502 }) })).resolves.toBe('network');
    await expect(reasonOf({ context: new Response('{}', { status: 500 }) })).resolves.toBe('network');
    await expect(reasonOf(new Error('offline'))).resolves.toBe('network');
    await expect(reasonOf(undefined)).resolves.toBe('network');
  });
});
