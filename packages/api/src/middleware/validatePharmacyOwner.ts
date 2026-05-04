import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Ensures the authenticated user owns the pharmacyId in route params.
 * Must run after authenticateUser.
 */
export async function validatePharmacyOwner(
  request: FastifyRequest<{ Params: { pharmacyId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { pharmacyId } = request.params
  if (!request.user.pharmacyId || request.user.pharmacyId !== pharmacyId) {
    return reply.code(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not own this pharmacy' },
    })
  }
}
