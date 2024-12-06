// ==UserScript==
// @name         Better pump.fun
// @namespace    https://github.com/yvvw/browser-scripts
// @homepageURL  https://github.com/yvvw/browser-scripts/blob/main/src/pumpfun.user.ts
// @version      0.0.26
// @description  增加跳转
// @author       yvvw
// @icon         https://www.pump.fun/icon.png
// @license      MIT
// @updateURL    https://mirror.ghproxy.com/https://github.com/yvvw/browser-scripts/releases/download/latest/pumpfun.meta.js
// @downloadURL  https://mirror.ghproxy.com/https://github.com/yvvw/browser-scripts/releases/download/latest/pumpfun.user.js
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
    const token = location.pathname.split('/').pop()!
    if (running || token.length <= 40 || prevToken === token) {
      return
    }
    running = true
    prevToken = token
    removeFilter()
    removeEle('/html/body/div[1]/nav/div[1]/div[2]')
      .catch(logger.error.bind(logger))
      .finally(() => (running = false))
    resizeChart().then().catch()
    addExternalLinks(token)
      .catch(logger.error.bind(logger))
      .finally(() => (running = false))
    clickTrade().then().catch()
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
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
  console.log('zxxx', tradeEle)
  tradeEle.click()
}
async function removeFilter() {
  const bodyEle = await HTMLUtils.query(() =>
    HTMLUtils.getFirstElementByXPath<HTMLDivElement>('/html/body')
  )
  bodyEle.setAttribute("style","width:80%")
  console.log('bodyEle', bodyEle)
}
