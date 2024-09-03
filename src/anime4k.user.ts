// ==UserScript==
// @name         Anime4K
// @namespace    https://github.com/yvvw/browser-scripts
// @version      0.0.2
// @description  Anime4K画质增强
// @credit       https://github.com/bloc97/Anime4K
// @credit       https://github.com/Anime4KWebBoost/Anime4K-WebGPU
// @author       yvvw
// @license      MIT
// @updateURL    https://mirror.ghproxy.com/https://github.com/yvvw/browser-scripts/releases/download/latest/anime4k.meta.js
// @downloadURL  https://mirror.ghproxy.com/https://github.com/yvvw/browser-scripts/releases/download/latest/anime4k.user.js
// @match        *://*/*
// ==/UserScript==

import type { Anime4KPipeline, Anime4KPresetPipelineDescriptor } from 'anime4k-webgpu'
import { ModeA, ModeAA, ModeB, ModeBB, ModeC, ModeCA } from 'anime4k-webgpu'
import debounce from 'debounce'

import FullscreenTexturedQuadWGSL from './shaders/fullscreenTexturedQuad.wgsl'
import SampleExternalTextureWGSL from './shaders/sampleExternalTexture.wgsl'

window.onload = function main() {
  new Anime4K().watch()
}

type IAnime4KPipelinePreset =
  | 'Anime4K: A'
  | 'Anime4K: B'
  | 'Anime4K: C'
  | 'Anime4K: A+A'
  | 'Anime4K: B+B'
  | 'Anime4K: C+A'

class Anime4K {
  #presetKeyMap: { [key: string]: IAnime4KPipelinePreset | 'Clear' } = {
    '`': 'Clear',
    '1': 'Anime4K: A',
    '2': 'Anime4K: A+A',
    '3': 'Anime4K: B',
    '4': 'Anime4K: B+B',
    '5': 'Anime4K: C',
    '6': 'Anime4K: C+A',
  }

  #getPipelines(
    preset: IAnime4KPipelinePreset,
    descriptor: Anime4KPresetPipelineDescriptor
  ): [...Anime4KPipeline[], Anime4KPipeline] {
    switch (preset) {
      case 'Anime4K: A':
        return [new ModeA(descriptor)]
      case 'Anime4K: B':
        return [new ModeB(descriptor)]
      case 'Anime4K: C':
        return [new ModeC(descriptor)]
      case 'Anime4K: A+A':
        return [new ModeAA(descriptor)]
      case 'Anime4K: B+B':
        return [new ModeBB(descriptor)]
      case 'Anime4K: C+A':
        return [new ModeCA(descriptor)]
      default:
        throw new Error(`unknown preset ${preset}`)
    }
  }

  #keyboardListener: ((ev: KeyboardEvent) => void) | undefined

  watch() {
    let lastPreset: string | undefined
    this.#keyboardListener = (ev: KeyboardEvent) => {
      const preset = this.#presetKeyMap[ev.key]
      if (preset === undefined) return
      if (preset === lastPreset) return this.#notice(preset)
      lastPreset = preset
      if (preset === 'Clear') {
        this.#clear().catch(this.destroy)
      } else {
        this.#start({ preset }).catch(this.destroy)
      }
    }
    window.addEventListener('keydown', this.#keyboardListener)
  }

  #resizeObserver?: ResizeObserver

  #stop?: () => Promise<void>

  async #start({ preset }: { preset: IAnime4KPipelinePreset }) {
    const video = this.#getVideo()
    video.style.setProperty('visibility', 'hidden')

    const { videoWidth, videoHeight } = video
    const videoAspectRatio = videoWidth / videoHeight

    const canvas = this.#getCanvas(video.parentElement!)
    canvas.style.removeProperty('display')

    const render = debounce(
      async ({ rectWidth, rectHeight }: { rectWidth: number; rectHeight: number }) => {
        const canvasWidth = rectWidth < rectHeight ? rectWidth : rectHeight * videoAspectRatio
        const canvasHeight = rectHeight < rectWidth ? rectHeight : rectWidth / videoAspectRatio
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        canvas.style.setProperty('left', `${(rectWidth - canvasWidth) / 2}px`)
        canvas.style.setProperty('top', `${(rectHeight - canvasHeight) / 2}px`)

        if (this.#stop) await this.#stop()
        this.#stop = await this.#render({ preset, canvas, video })
      },
      100,
      { immediate: false }
    )

    this.#resizeObserver?.disconnect()
    this.#resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return
      const entry = entries[0]
      if (!(entry.target instanceof HTMLVideoElement)) return this.#clear()
      render({ rectWidth: entry.contentRect.width, rectHeight: entry.contentRect.height })
    })
    this.#resizeObserver!.observe(video)

    render({ rectWidth: video.clientWidth, rectHeight: video.clientHeight })

    this.#notice(preset)
  }

  async #render({
    preset,
    canvas,
    video,
  }: {
    preset: IAnime4KPipelinePreset
    canvas: HTMLCanvasElement
    video: HTMLVideoElement
  }) {
    if (video.readyState < video.HAVE_FUTURE_DATA) {
      await new Promise((resolve) => (video.onloadeddata = resolve))
    }

    const { videoWidth, videoHeight } = video
    const { width: canvasWidth, height: canvasHeight } = canvas

    const device = await this.#getGPUDevice()
    const context = canvas.getContext('webgpu') as GPUCanvasContext
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'premultiplied' })

    const inputTexture = device.createTexture({
      size: [videoWidth, videoHeight, 1],
      format: 'rgba16float',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })

    const pipelines = this.#getPipelines(preset, {
      nativeDimensions: { width: videoWidth, height: videoHeight },
      targetDimensions: { width: canvasWidth, height: canvasHeight },
      device,
      inputTexture,
    })

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Bind Group Layout',
      entries: [
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      ],
    })

    const renderPipeline = device.createRenderPipeline({
      vertex: {
        entryPoint: 'vert_main',
        module: device.createShaderModule({ code: FullscreenTexturedQuadWGSL }),
      },
      primitive: { topology: 'triangle-list' },
      fragment: {
        entryPoint: 'main',
        targets: [{ format }],
        module: device.createShaderModule({ code: SampleExternalTextureWGSL }),
      },
      layout: device.createPipelineLayout({
        label: 'Pipeline Layout',
        bindGroupLayouts: [bindGroupLayout],
      }),
    })

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 1,
          resource: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }),
        },
        {
          binding: 2,
          resource: pipelines.at(-1)!.getOutputTexture().createView(),
        },
      ],
    })

    const updateTexture = () =>
      device.queue.copyExternalImageToTexture({ source: video }, { texture: inputTexture }, [
        videoWidth,
        videoHeight,
      ])

    let stop = false
    let requestId: ReturnType<(typeof video)['requestVideoFrameCallback']>

    const renderFrame = () => {
      if (!video.paused) updateTexture()

      const commandEncoder = device.createCommandEncoder()
      pipelines.forEach((pipeline) => pipeline.pass(commandEncoder))

      const renderPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })
      renderPassEncoder.setPipeline(renderPipeline)
      renderPassEncoder.setBindGroup(0, bindGroup)
      renderPassEncoder.draw(6)
      renderPassEncoder.end()

      device.queue.submit([commandEncoder.finish()])

      if (!stop) requestId = video.requestVideoFrameCallback(renderFrame)
    }

    requestId = video.requestVideoFrameCallback(renderFrame)

    updateTexture()
    renderFrame()

    return async () => {
      stop = true
      video.cancelVideoFrameCallback(requestId)
      await device.queue.onSubmittedWorkDone()
      context.unconfigure()
      device.destroy()
    }
  }

  async #clear() {
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect()
      this.#resizeObserver = undefined
    }

    if (this.#stop) await this.#stop()

    const canvas = document.getElementById(this.#canvasId) as HTMLCanvasElement | null
    if (canvas) canvas.style.setProperty('display', 'none')

    if (this.#video) {
      this.#video.style.removeProperty('visibility')
      this.#notice('Clear')
    }
  }

  #video?: HTMLVideoElement

  #getVideo() {
    if (this.#video) return this.#video!

    const videos = document.querySelectorAll('video')
    if (videos.length === 0) {
      throw new Error('video not found')
    }
    for (const video of videos) {
      if (video.clientWidth * video.clientHeight * 4 > window.innerWidth * window.innerHeight) {
        this.#video = video
        return this.#video!
      }
    }
    throw new Error('valid video not found')
  }

  #canvasId = '__gpu-canvas__'

  #getCanvas(container: HTMLElement): HTMLCanvasElement {
    let canvas = document.getElementById(this.#canvasId) as HTMLCanvasElement | null
    if (canvas !== null) return canvas

    canvas = document.createElement('canvas')
    canvas.id = this.#canvasId
    canvas.style.setProperty('position', 'absolute')
    container.appendChild(canvas)

    return canvas
  }

  async #getGPUDevice() {
    const adapter = await navigator.gpu.requestAdapter()
    if (adapter === null) throw new Error('WebGPU not supported')
    return adapter.requestDevice()
  }

  async destroy() {
    await this.#clear()

    if (this.#keyboardListener) {
      window.removeEventListener('keydown', this.#keyboardListener)
      this.#keyboardListener = undefined
    }

    this.#destroyById(this.#canvasId)
    this.#destroyById(this.#noticeId)
  }

  #destroyById(id: string) {
    let el = document.getElementById(id)
    if (el !== null) el.parentElement?.removeChild(el)
  }

  #noticeTimer?: ReturnType<typeof setTimeout>
  #noticeId = '__gpu-notice__'

  #notice(text: string) {
    const container = this.#getVideo().parentElement!
    if (container !== null) this.#notice1(container, text)
  }

  #notice1(container: HTMLElement, text: string) {
    let noticeEl = document.getElementById(this.#noticeId)
    if (noticeEl === null) {
      noticeEl = document.createElement('div')
      noticeEl.id = this.#noticeId
      noticeEl.style.setProperty('position', 'absolute')
      noticeEl.style.setProperty('z-index', '1')
      noticeEl.style.setProperty('top', '12px')
      noticeEl.style.setProperty('left', '12px')
      noticeEl.style.setProperty('padding', '12px')
      noticeEl.style.setProperty('background', '#4b4b4be6')
      noticeEl.style.setProperty('border-radius', '5px')
      noticeEl.style.setProperty('font-size', '2rem')
      noticeEl.style.setProperty('color', 'white')
      noticeEl.style.setProperty('transition', 'opacity 0.3s')
      container.appendChild(noticeEl)
    }

    noticeEl.innerText = text
    noticeEl.style.setProperty('opacity', '1')

    clearTimeout(this.#noticeTimer)
    this.#noticeTimer = setTimeout(() => noticeEl.style.setProperty('opacity', '0'), 1500)
  }
}