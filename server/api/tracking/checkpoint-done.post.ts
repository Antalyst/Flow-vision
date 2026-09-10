/**
 * POST /api/tracking/checkpoint-done
 *
 * Checkpoint clearance and release handler (alias to /api/documents/complete-checkpoint).
 * Allows employees to approve station checkpoint review, releasing the document
 * for the next courier pickup and dispatching pre-pickup ASN alerts to the destination office.
 */

import completeCheckpointHandler from '~~/server/api/documents/complete-checkpoint.post'

export default completeCheckpointHandler
