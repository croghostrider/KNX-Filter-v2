const { XMLParser, XMLBuilder } = require('fast-xml-parser')
const Tree = require('@widgetjs/tree')

const dropZone = document.querySelector('.drop-zone')
const fileInput = document.querySelector('#fileInput')
const browseBtn = document.querySelector('#browseBtn')
const bgProgress = document.querySelector('.bg-progress')
const progressPercent = document.querySelector('#progressPercent')
const progressContainer = document.querySelector('.progress-container')
const progressBar = document.querySelector('.progress-bar')
const prozessStatus = document.querySelector('.status')
const settingsContainer = document.querySelector('.settings-container')
const downloadBtn = document.querySelector('#downloadBtn')
const COV = document.querySelector('#COV')
const totalFound = document.querySelector('#totalFound')
const toast = document.querySelector('.toast')

const maxAllowedSize = 100 * 1024 * 1024 // 100mb
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '_',
  format: true,
  suppressUnpairedNode: false,
  unpairedTags: ['Telegram']
}
let telegrams = {}
let filterSrc = []
let filterDst = []

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

function getAllSrcDst (data) {
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

function filterTelegram () {
  const filteresKnx = [{ CommunicationLog: { Telegram: [], _xmlns: 'http://knx.org/xml/telegrams/01' } }]
  const valuesCov = {}
  const length = telegrams.length
  for (let i = 0; i < length; i++) {
    const telegram = decode(telegrams[i]._RawData)
    if (filterDst.includes(telegram.dst) || filterSrc.includes(telegram.scr)) {
      if (COV.checked) {
        if (Object.prototype.hasOwnProperty.call(valuesCov, telegram.dst)) {
          if (String(valuesCov[telegram.dst]) !== String(telegram.data)) {
            valuesCov[telegram.dst] = telegram.data
            filteresKnx[0].CommunicationLog.Telegram.push(telegrams[i])
          }
        } else {
          valuesCov[telegram.dst] = telegram.data
          filteresKnx[0].CommunicationLog.Telegram.push(telegrams[i])
        }
      } else {
        filteresKnx[0].CommunicationLog.Telegram.push(telegrams[i])
      }
    }
    const percent = Math.round((100 * i) / length)
    progressPercent.innerText = percent
    const scaleX = `scaleX(${percent / 100})`
    bgProgress.style.transform = scaleX
    progressBar.style.transform = scaleX
  }
  return filteresKnx[0]
}

function formatData (data, separator) {
  const treeData = []
  const treeObject = {}
  for (const path of data) {
    const nodes = path.split(separator)
    let current = treeObject
    for (const node of nodes) {
      if (!current[node]) {
        current[node] = {}
      }
      current = current[node]
    }
  }
  const level1 = Object.keys(treeObject)
  for (let i = 0; i < level1.length; i++) {
    let id = level1[i] + separator
    treeData.push({ id, text: id, children: [] })
    const level2 = Object.keys(treeObject[level1[i]])
    for (let i2 = 0; i2 < level2.length; i2++) {
      id = level1[i] + separator + level2[i2]
      treeData[i].children.push({ id, text: id, children: [] })
      const level3 = Object.keys(treeObject[level1[i]][level2[i2]])
      for (let i3 = 0; i3 < level3.length; i3++) {
        id = level1[i] + separator + level2[i2] + separator + level3[i3]
        treeData[i].children[i2].children.push({ id, text: id })
      }
    }
  }
  return treeData
}

function fillTree (data) {
  const allFilters = getAllSrcDst(data)
  console.log('found ' + allFilters.dst.length + ' group addresses')
  console.log('found ' + allFilters.src.length + ' physical addresses')
  console.timeEnd('Execution Time analyze File')
  const dataDst = formatData(allFilters.dst, '/')
  const dataSrc = formatData(allFilters.src, '.')
  // eslint-disable-next-line no-unused-vars
  const treeDst = new Tree('#treeDst', {
    data: dataDst,
    closeDepth: 2,
    onChange: function () {
      console.log(this.values)
      filterDst = this.values
    }
  })
  // eslint-disable-next-line no-unused-vars
  const treeSrc = new Tree('#treeSrc', {
    data: dataSrc,
    closeDepth: 2,
    onChange: function () {
      console.log(this.values)
      filterSrc = this.values
    }
  })
}

function analyzeFile () {
  console.time('Execution Time analyze File')
  console.log('file added uploading')
  const file = fileInput.files[0]
  const parser = new XMLParser(options)
  dropZone.style.display = 'none'
  // show the uploader
  progressContainer.style.display = 'block'
  // eslint-disable-next-line no-undef
  const reader = new FileReader()
  reader.onload = function (event) {
    const data = event.target.result
    const jsonObj = parser.parse(data)
    // console.log(JSON.stringify(jsonObj))
    fileInput.value = '' // reset the input
    prozessStatus.innerText = 'Done'
    progressContainer.style.display = 'none' // hide the box
    settingsContainer.style.display = 'block'
    telegrams = jsonObj.CommunicationLog.Telegram
    console.log('found ' + telegrams.length + ' telegrams')
    totalFound.innerText = 'Total ' + telegrams.length + ' telegrams'
    settingsContainer.style.display = 'block'
    fillTree(telegrams)
  }
  reader.readAsBinaryString(file)
  // listen for upload progress
  reader.onprogress = function (event) {
    // find the percentage of uploaded
    const percent = Math.round((100 * event.loaded) / event.total)
    console.log(percent + '% uploaded')
    progressPercent.innerText = percent
    const scaleX = `scaleX(${percent / 100})`
    bgProgress.style.transform = scaleX
    progressBar.style.transform = scaleX
  }

  // handle error
  reader.onerror = function () {
    showToast('Error in upload.')
    fileInput.value = '' // reset the input
  }
}

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
  const ext = fileInput.files[0].type
  if (ext === 'text/xml') {
    if (fileInput.files[0].size > maxAllowedSize) {
      showToast('Max file size is 100MB')
      fileInput.value = '' // reset the input
      return
    }
  } else {
    showToast('Only XML files are allowed')
    fileInput.value = '' // reset the input
    return
  }
  analyzeFile()
})

downloadBtn.addEventListener('click', () => {
  if (filterDst.length === 0 && filterSrc.length === 0 && COV.checked === false) {
    showToast('Select a filter or check COV.')
  } else {
    const newKNX = filterTelegram()
    const builder = new XMLBuilder(options)
    const xmlDataStr = builder.build(newKNX)
    // eslint-disable-next-line no-undef
    const blob = new Blob([xmlDataStr], { type: 'text/xml' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'data.xml'
    document.body.appendChild(link)
    link.click()
    // window.location.reload()
  }
})
