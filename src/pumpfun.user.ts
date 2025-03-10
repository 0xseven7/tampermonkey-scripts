// ==UserScript==
// @name         Better pump.fun
// @namespace    https://github.com/yvvw/browser-scripts
// @homepageURL  https://github.com/yvvw/browser-scripts/blob/main/src/pumpfun.user.ts
// @version      0.0.26
// @description  增加跳转
// @author       0xseven
// @icon         https://www.pump.fun/icon.png
// @license      MIT
// @updateURL    https://mirror.ghproxy.com/https://github.com/0xseven7/browser-scripts/releases/download/latest/pumpfun.meta.js
// @downloadURL  https://mirror.ghproxy.com/https://github.com/0xseven7/browser-scripts/releases/download/latest/pumpfun.user.js
// @match        https://www.pump.fun/*
// @match        https://pump.fun/*
// @noframes
// ==/UserScript==

import { HTMLUtils, Logger } from './util'
const logger = Logger.new('Better pump.fun')
window.onload = function main() {

  let running = false
  let prevToken = ''
  const run = () => {
  playSellAudio()
    const token = location.pathname.split('/').pop()!
    if (running || token.length <= 40 || prevToken === token) {
      return
    }
    running = true
    prevToken = token
    removeFilter()
    removeEle('/html/body/div[1]')
      .catch(logger.error.bind(logger))
      .finally(() => (running = false))
    resizeChart().then().catch()
    // clickTrade().then().catch()
    markTradePanel().catch(logger.error.bind(logger)),
      addExternalLinks(token)
        .catch(logger.error.bind(logger))
        .finally(() => (running = false))
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
}
async function markTradePanel() {
  const tradesEl = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('//div[text()="trades"]')
  )

  const click = tradesEl.click
  tradesEl.removeEventListener('click', click)
  tradesEl.addEventListener('click', function () {
    labelDevInTradePanel()
  })
  click.apply(tradesEl)
}
const pendingClose = new Set<Function>()

async function labelDevInTradePanel() {
  const devEl = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<any>(
      '//button[text()="[go back]"]/parent::div/following-sibling::div[1]/div/div[2]/a'
    )
  )

  if (!devEl) {
    throw new Error('未发现dev标签')
  }  
  
  const devAddress = devEl.href.split('/').pop()
  const tableEl = await HTMLUtils.query(() => document.querySelector<HTMLTableElement>('table'))

  function labelTrade(el: HTMLTableRowElement, idx: number) {
    const nameEl = el.cells.item(0)?.firstElementChild as HTMLAnchorElement | null
    if (!nameEl) {
      logger.warn('未发现a标签')
      return
    }
    const operateType = (el.cells.item(1) as HTMLDivElement).innerText

    const solEl = el.children.item(3) as HTMLDivElement
    const solAmount = parseFloat(solEl.innerText)
    solEl.classList.remove('text-green-300', 'text-red-300')
    if (solAmount >= 1) {
      if (operateType === 'buy') {
        solEl.classList.add('text-green-300')
      } else if (operateType === 'sell') {
        solEl.classList.add('text-red-300')
      }
    }

    const rowAddress = nameEl.href.split('/').pop()

    if (rowAddress === devAddress) {
      if (operateType === 'buy') {
        el.classList.add('text-white', 'bg-green-500')
      } else if (operateType === 'sell') {
        el.classList.add('text-white', 'bg-red-500')
        if (idx < 4) {
          playSellAudio()
        }
      }
    } else {
      el.classList.remove('text-white', 'bg-green-500', 'bg-red-500')
    }
  }

  const tBodyEl = tableEl.tBodies.item(0)!
  pendingClose.add(
    HTMLUtils.observe(
      tableEl,
      () => {
        for (let i = 0; i < tBodyEl.rows.length; i++) {
          labelTrade(tBodyEl.rows.item(i)!, i)
        }
      },
      { throttle: 500 }
    )
  )
}

async function addExternalLinks(token: string) {
  const threadEl = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('//div[text()="thread"]')
  )
  const divWrapEl = document.createElement('div')
  divWrapEl.classList.add('flex', 'gap-2', 'text-green-300', 'ml-auto')

  divWrapEl.appendChild(
    createExternalLink('xsearch', `https://x.com/search?q=${token}&src=typed_query`)
  )
  divWrapEl.appendChild(createExternalLink('gmgn', `https://gmgn.ai/sol/token/${token}`))
  divWrapEl.appendChild(
    createExternalLink('photon', `https://photon-sol.tinyastro.io/en/lp/${token}`)
  )
  threadEl.parentElement?.appendChild(divWrapEl)
}

function createExternalLink(text: string, href: string) {
  const el = document.createElement('a')
  el.setAttribute('href', href)
  el.setAttribute('target', '_blank')
  el.innerText = text
  return el
}

async function removeEle(path: string) {
  const headTokenEle = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>(path)
  )
  headTokenEle.remove()
}
async function resizeChart() {
  const chartEle = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('//div[starts-with(@id,"tv-chart")]')
  )
  chartEle.setAttribute('style', 'height: 400px')
}

async function clickTrade() {
  const tradeEle = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('//div[text()="trades"]')
  )
  tradeEle.click()
}
async function removeFilter() {
  const bodyEle = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('/html/body')
  )
  bodyEle.setAttribute('style', 'width:80%')
  console.log('bodyEle', bodyEle)
}
let playing = false

function playSellAudio() {
  if (playing) {
    return
  }
  playing = true
  const base64Audio = "data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQElYAIAAAACAAEA8UAAc3RAgkA/hsQAiEArlCuZWz0mQdLwwPE6je/cj0cyfpxzD3kbrF+cU3K6/c="

  const audio = new Audio(base64Audio)
  audio.play().finally(() => setTimeout(() => (playing = false), 5000))
}
