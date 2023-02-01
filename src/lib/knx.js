function decodeIndividualAddress (individualAddress) {
  return `${individualAddress >> 12 & 31}.${individualAddress >> 8 & 7}.${individualAddress & 255}`
}

function decodeGroupAddress (groupAddress) {
  return `${groupAddress >> 11 & 31}/${groupAddress >> 8 & 7}/${groupAddress & 255}`
}

function hexToBytes (hex) {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

export function decode (buf) {
  const rawData = hexToBytes(buf.slice(8))
  const src = decodeIndividualAddress(rawData[0] << 8 | rawData[1])
  const dst = decodeGroupAddress(rawData[2] << 8 | rawData[3])
  const data = rawData.slice(6)
  return { src, dst, data }
}

export function getAllSrcDst (data) {
  const srcTmp = []
  const dstTmp = []
  for (let i = 0; i < data.length; i++) {
    const telegram = decode(data[i]._RawData)
    srcTmp.push(telegram.src)
    dstTmp.push(telegram.dst)
  }
  const src = [...new Set(srcTmp)]
  const dst = [...new Set(dstTmp)]
  return { src, dst }
}

export function filterKnxData (data, src, dst, cov) {
  const xmlKnx = [{ CommunicationLog: { Telegram: [], _xmlns: 'http://knx.org/xml/telegrams/01' } }]
  const valuesCov = {}
  if (src === '') { console.log('src ist leer') }
  for (let i = 0; i < data.length; i++) {
    const telegram = decode(data[i]._RawData)
    if (src.includes(telegram.src) || dst.includes(telegram.dst)) {
      if (cov) {
        if (Object.prototype.hasOwnProperty.call(valuesCov, telegram.dst)) {
          if (String(valuesCov[telegram.dst]) !== String(telegram.data)) {
            valuesCov[telegram.dst] = telegram.data
            xmlKnx[0].CommunicationLog.Telegram.push(data[i])
          }
        } else {
          valuesCov[telegram.dst] = telegram.data
          xmlKnx[0].CommunicationLog.Telegram.push(data[i])
        }
      } else {
        xmlKnx[0].CommunicationLog.Telegram.push(data[i])
      }
    }
  }
  return xmlKnx
}
