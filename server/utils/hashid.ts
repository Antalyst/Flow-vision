import Hashids from 'hashids'
const hashids = new Hashids("FlowVision-Secret-Salt", 10)
export const encodeId = (id: number) => hashids.encode(id)
export const decodeId = (hashedId: string) => hashids.decode(hashedId)[0]