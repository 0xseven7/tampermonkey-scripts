// ==UserScript==
// @name         Better pump.fun
// @namespace    https://github.com/yvvw/tampermonkey-scripts
// @version      0.0.1
// @description  增加gmgn、bullx跳转
// @author       yvvw
// @icon         https://www.pump.fun/icon.png
// @license      MIT
// @updateURL    https://mirror.ghproxy.com/https://github.com/yvvw/tampermonkey-scripts/releases/download/latest/pumpfun.meta.js
// @downloadURL  https://mirror.ghproxy.com/https://github.com/yvvw/tampermonkey-scripts/releases/download/latest/pumpfun.user.js
// @match        https://www.pump.fun/*
// @match        https://pump.fun/*
// @grant        none
// ==/UserScript==

import { waitingElement } from './util'

const clearChannel = new Set<Function>()

window.onload = function main() {
  let running = false
  let prevToken = ''

  new MutationObserver(() => {
    const token = location.pathname.slice(1)
    if (running || token.length <= 40 || prevToken === token) {
      return
    }
    running = true
    prevToken = token

    if (clearChannel.size > 0) {
      clearChannel.forEach((fn) => fn())
      clearChannel.clear()
    }

    Promise.allSettled([
      addExternalLinks(),
      autoSwitchTradePanel(),
      labelDevInTradePanel(),
    ]).finally(() => (running = false))

  }).observe(document.body, {
    childList: true,
    subtree: true,
  })
}

async function addExternalLinks() {
  const threadEl = await waitingElement(
    () => document.evaluate('//div[text()="Thread"]', document).iterateNext() as HTMLDivElement
  )

  const address = location.pathname.replace('/', '')

  const divWrapEl = document.createElement('div')
  divWrapEl.className = 'flex gap-2'
  divWrapEl.style.marginLeft = 'auto'
  divWrapEl.style.color = 'rgb(134 239 172/var(--tw-bg-opacity))'

  const gmgnLinkEl = document.createElement('a')
  gmgnLinkEl.id = 'gmgn'
  gmgnLinkEl.href = `https://gmgn.ai/sol/token/${address}`
  gmgnLinkEl.target = '_blank'
  gmgnLinkEl.innerText = 'GMGN'
  divWrapEl.appendChild(gmgnLinkEl)

  const bullXLinkEl = document.createElement('a')
  bullXLinkEl.id = 'bullx'
  bullXLinkEl.href = `https://bullx.io/terminal?chainId=1399811149&address=${address}`
  bullXLinkEl.target = '_blank'
  bullXLinkEl.innerText = 'BullX'
  divWrapEl.appendChild(bullXLinkEl)

  threadEl.parentElement?.appendChild(divWrapEl)
}

async function autoSwitchTradePanel() {
  const tradesEl = await waitingElement(
    () => document.evaluate('//div[text()="Trades"]', document).iterateNext() as HTMLDivElement
  )
  tradesEl.click()
}

async function labelDevInTradePanel() {
  const labelEl = await waitingElement(
    () =>
      document
        .evaluate('//label[text()="Filter by following"]', document)
        .iterateNext() as HTMLLabelElement
  )

  const tableEl = labelEl.parentElement?.parentElement
  if (!tableEl) {
    throw new Error('未发现交易面板')
  }

  const devSibEl = await waitingElement(
    () =>
      document.evaluate('//span[text()="created by"]', document).iterateNext() as HTMLSpanElement
  )
  const devEl = devSibEl.nextSibling as HTMLAnchorElement | undefined
  if (!devEl) {
    throw new Error('未发现dev标签')
  }
  const devName = devEl.href.split('/').pop()

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.addedNodes.length === 0) {
        continue
      }
      for (const node of record.addedNodes) {
        const nodeEl = node as HTMLDivElement
        const nameEl = nodeEl.firstElementChild?.firstElementChild as HTMLAnchorElement | undefined
        if (!nameEl) {
          throw new Error('未发现a标签')
        }
        const operateType = nodeEl.children.item(1)!.innerHTML
        const rowName = nameEl.href.split('/').pop()
        if (rowName === devName) {
          if (operateType === 'buy') {
            nodeEl.className += 'text-white bg-green-500'
          } else if (operateType === 'sell') {
            nodeEl.className += 'text-white bg-red-500'
          }
        }
      }
    }
  })
  observer.observe(tableEl, { childList: true, subtree: true })
  clearChannel.add(() => observer.disconnect())
}
