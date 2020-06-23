const config = require('../linyizhou/config')
const storage = require('electron-localstorage')
const appState = storage.getItem('appState')
const dbData = appState.db[config.dhOrigin] || {}

const replaceButton = () => {
  const main = document.querySelector('.publish')

  const header = document.querySelector('.header')
  header.style.display = 'none'

  document.querySelector('div.bottom').style.display = 'none'

  const buttonCJ = document.createElement('button')
  buttonCJ.innerText = '采集'
  buttonCJ.type = 'button'
  buttonCJ.onclick = commandCJ

  const buttonKD = document.createElement('button')
  buttonKD.innerText = '刊登'
  buttonKD.type = 'button'
  buttonKD.onclick = commandKD

  main.insertBefore(buttonCJ, header)
  main.insertBefore(buttonKD, buttonCJ)
}

const commandCJ = async (step) => {
  openInput()
  await insertValue()
  // commitNext()
}

const commandKD = async (step) => {
  selectAll()
  publish()
}

const openInput = () => {
  const topoptions = document.querySelector('.topoptions')
  const mutilpleExtract = topoptions.children[2].children[1]
  mutilpleExtract.click()
}

const insertValue = () => {
  const urls = []

  for (const i in dbData) {
    if (dbData.hasOwnProperty(i)) {
      const element = dbData[i]
      urls.push(element.url)
    }
  }

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const input = document.querySelector('textarea.urls.resize-none')
      if (input) {
        input.innerText = urls.join('\n')
        clearInterval(timer)
        resolve(input.innerText)
      }
    }, 500)
  })
}

// const commitNext = () => {
//   // const commitButton = document.querySelector('a.btn.btn-default.defbutton.btnnext')
//   // axios.post('https://www.wxwerp.com/do/get.ashx', {
//   //   act: 'get_productgather_step2_infor',
//   //   urls: 'https://item.taobao.com/item.htm?id=576480769764&ali_refid=a3_420434_1006:1150055016:N:FGpgVqHYFfuXKNVoCV4RS88Y%2BwbQe%2FMp:0facb97872db96bdc736b1ed3c4282c2&ali_trackid=1_0facb97872db96bdc736b1ed3c4282c2&spm=a230r.1.1957635.22',
//   //   s: '951871',
//   //   platform: ' 3'
//   // }, {
//   //   headers: {
//   //     'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
//   //   }
//   // }).then(res => {
//   //   console.log(res)
//   // })
// }

const selectAll = () => {
  const checkAll = document.querySelector('input.chkall')
  checkAll.click()
}

const publish = () => {
  const publishButton = document.querySelector('div.topoptions').children[1].children[0]
  publishButton.click()

  const timer = setInterval(() => {
    const buttonStart = document.querySelector('a.btn.btn-default.btnstart')
    if (buttonStart) {
      clearInterval(timer)
      buttonStart.onclick = checkFinish
      buttonStart.click()
    }
  }, 500)
}

const checkFinish = () => {
  const timer = setInterval(() => {
    const progresstext = document.querySelector('div.progresstext')
    if (progresstext) {
      const text = progresstext.children[0].innerText
      if (text === '100%') {
        commandCJ()
        clearInterval(timer)
      }
    }
  }, 1000)
}

module.exports = {
  replaceButton
}
