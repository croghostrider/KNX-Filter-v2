const { XMLParser, XMLBuilder } = require('fast-xml-parser')

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

function decode (buf) {
  const rawData = hexToBytes(buf.slice(8))
  const src = decodeIndividualAddress(rawData[0] << 8 | rawData[1])
  const dst = decodeGroupAddress(rawData[2] << 8 | rawData[3])
  const data = rawData.slice(6)
  return { src, dst, data }
}

// function getAllSrcDst (data) {
//   const srcTmp = []
//   const dstTmp = []
//   for (let i = 0; i < data.length; i++) {
//     const telegram = decode(data[i]._RawData)
//     srcTmp.push(telegram.src)
//     dstTmp.push(telegram.dst)
//   }
//   const src = [...new Set(srcTmp)]
//   const dst = [...new Set(dstTmp)]
//   return { src, dst }
// }

// function filterKnxData (data, src, dst, cov) {
//   const xmlKnx = [{ CommunicationLog: { Telegram: [], _xmlns: 'http://knx.org/xml/telegrams/01' } }]
//   const valuesCov = {}
//   if (src === '') { console.log('src ist leer') }
//   for (let i = 0; i < data.length; i++) {
//     const telegram = decode(data[i]._RawData)
//     if (src.includes(telegram.src) || dst.includes(telegram.dst)) {
//       if (cov) {
//         if (Object.prototype.hasOwnProperty.call(valuesCov, telegram.dst)) {
//           if (String(valuesCov[telegram.dst]) !== String(telegram.data)) {
//             valuesCov[telegram.dst] = telegram.data
//             xmlKnx[0].CommunicationLog.Telegram.push(data[i])
//           }
//         } else {
//           valuesCov[telegram.dst] = telegram.data
//           xmlKnx[0].CommunicationLog.Telegram.push(data[i])
//         }
//       } else {
//         xmlKnx[0].CommunicationLog.Telegram.push(data[i])
//       }
//     }
//   }
//   return xmlKnx
// }

const dropZone = document.querySelector('.drop-zone')
const fileInput = document.querySelector('#fileInput')
const browseBtn = document.querySelector('#browseBtn')
// const plusIco = document.querySelector('.plus')
// const iCheckbox = document.querySelector('input[type=checkbox]')

const bgProgress = document.querySelector('.bg-progress')
const progressPercent = document.querySelector('#progressPercent')
const progressContainer = document.querySelector('.progress-container')
const progressBar = document.querySelector('.progress-bar')
const prozessStatus = document.querySelector('.status')
const sharingContainer = document.querySelector('.sharing-container')
const downloadBtn = document.querySelector('#downloadBtn')
const toast = document.querySelector('.toast')

const maxAllowedSize = 100 * 1024 * 1024 // 100mb

browseBtn.addEventListener('click', () => {
  fileInput.click()
})

dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  console.log('dropped', e.dataTransfer.files[0].name)
  const files = e.dataTransfer.files
  if (files.length === 1) {
    if (files[0].size < maxAllowedSize) {
      fileInput.files = files
      analyzeFile()
    } else {
      showToast('Max file size is 100MB')
    }
  } else if (files.length > 1) {
    showToast("You can't upload multiple files")
  }
  dropZone.classList.remove('dragged')
})

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('dragged')
  console.log('dropping file')
})

dropZone.addEventListener('dragleave', (e) => {
  dropZone.classList.remove('dragged')

  console.log('drag ended')
})

// file input change and uploader
fileInput.addEventListener('change', () => {
  if (fileInput.files[0].size > maxAllowedSize) {
    showToast('Max file size is 100MB')
    fileInput.value = '' // reset the input
    return
  }
  analyzeFile()
})

const analyzeFile = () => {
  console.log('file added uploading')
  const file = fileInput.files[0]
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    format: true,
    suppressUnpairedNode: false,
    unpairedTags: ['Telegram ']
  }

  const parser = new XMLParser(options)

  // show the uploader
  progressContainer.style.display = 'block'
  console.log('dfghing')

  // eslint-disable-next-line no-undef
  const reader = new FileReader()
  console.log('66777')
  reader.onload = function (event) {
    console.log('1122111')
    const data = event.target.result
    const jsonObj = parser.parse(data)
    console.log(JSON.stringify(jsonObj))
    const telegrams = jsonObj.CommunicationLog.Telegram
    prozessStatus.innerText = 'Filtering'
    const groupAddresses = ['0/1/0']
    const filteresKnx = [{ CommunicationLog: { Telegram: [], _xmlns: 'http://knx.org/xml/telegrams/01' } }]
    // const filteresKnx2 = [{ CommunicationLog: { Telegram: [{ _Timestamp: '2022-08-20T08:32:26.500Z', _Service: 'L_Data.ind', _FrameFormat: 'CommonEmi', _RawData: '2900bce0c70d0297010080' }, { _Timestamp: '2022-08-20T09:32:24.145Z', _Service: 'L_Data.ind', _FrameFormat: 'CommonEmi', _RawData: '2900b8c04b0202010700809004c1000000' }], RecordStop: { _Timestamp: '2022-08-20T09:32:26.088Z' }, _xmlns: 'http://knx.org/xml/telegrams/01' } }]
    const valuesOld = {}
    const length = telegrams.length
    for (let i = 0; i < length; i++) {
      const telegram = decode(telegrams[i]._RawData)
      if (groupAddresses.includes(telegram.dst)) {
        if (Object.prototype.hasOwnProperty.call(valuesOld, telegram.dst)) {
          // console.log('hasOwnProperty true')
          if (String(valuesOld[telegram.dst]) !== String(telegram.data)) {
            // console.log('valuesOld not same')
            valuesOld[telegram.dst] = telegram.data
            // filteresKnx.push({ Telegram: telegrams[i] })
            filteresKnx[0].CommunicationLog.Telegram.push(telegrams[i])
          }
        } else {
          // console.log('hasOwnProperty false')
          valuesOld[telegram.dst] = telegram.data
          // filteresKnx.push({ Telegram: telegrams[i] })
          filteresKnx[0].CommunicationLog.Telegram.push(telegrams[i])
        }
      }
      const percent = Math.round((100 * i) / length)
      progressPercent.innerText = percent
      const scaleX = `scaleX(${percent / 100})`
      bgProgress.style.transform = scaleX
      progressBar.style.transform = scaleX
    }
    console.log(filteresKnx)
    prozessStatus.innerText = 'Done'
    fileInput.value = '' // reset the input
    progressContainer.style.display = 'none' // hide the box
    sharingContainer.style.display = 'block'

    const builder = new XMLBuilder(options)
    const xmlDataStr = builder.build(filteresKnx[0])
    // eslint-disable-next-line no-undef
    const blob = new Blob([xmlDataStr], { type: 'text/xml' })

    downloadBtn.href = window.URL.createObjectURL(blob)
    downloadBtn.download = 'data.xml'
  }
  reader.readAsBinaryString(file)

  /* // listen for upload progress
  xhr.upload.onprogress = function (event) {
    // find the percentage of uploaded
    const percent = Math.round((100 * event.loaded) / event.total)
    progressPercent.innerText = percent
    const scaleX = `scaleX(${percent / 100})`
    bgProgress.style.transform = scaleX
    progressBar.style.transform = scaleX
  }

  // handle error
  xhr.upload.onerror = function () {
    showToast(`Error in upload: ${xhr.status}.`)
    fileInput.value = '' // reset the input
  }
  */
}
/*
const onFileUploadSuccess = (res) => {
  fileInput.value = '' // reset the input
  prozessStatus.innerText = 'Done'

  // remove the disabled attribute from form btn & make text send
  emailForm[2].removeAttribute('disabled')
  emailForm[2].innerText = 'Send'
  progressContainer.style.display = 'none' // hide the box

  const { file: url } = JSON.parse(res)
  console.log(url)
  sharingContainer.style.display = 'block'
  fileURL.value = url
}
 */
let toastTimer
// the toast function
const showToast = (msg) => {
  clearTimeout(toastTimer)
  toast.innerText = msg
  toast.classList.add('show')
  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
  }, 2000)
}
