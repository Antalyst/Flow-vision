/** Client/employee checkpoint deep link — must match server `buildCheckpointQrPayload`. */
export function buildCheckpointQrPayload(officeId: string): string {
  return `flowvision://track/checkpoint?office_id=${officeId}`
}
