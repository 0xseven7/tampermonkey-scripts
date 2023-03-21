// ==UserScript==
// @name         Better Bilibili
// @namespace    https://github.com/yvvw/tampermonkey-scripts
// @version      0.0.2
// @description  移除不需要组件、网页全屏、最高可用清晰度
// @author       yvvw
// @icon         https://www.bilibili.com/favicon.ico
// @license      MIT
// @updateURL    https://ghproxy.com/https://raw.githubusercontent.com/yvvw/tampermonkey-scripts/main/dist/bilibili_better.user.js
// @downloadURL  https://ghproxy.com/https://raw.githubusercontent.com/yvvw/tampermonkey-scripts/main/dist/bilibili_better.user.js
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @match        https://live.bilibili.com/*
// @grant        none
// ==/UserScript==

(()=>{var a=(n,e,t)=>new Promise((i,l)=>{var c=s=>{try{u(t.next(s))}catch(o){l(o)}},y=s=>{try{u(t.throw(s))}catch(o){l(o)}},u=s=>s.done?i(s.value):Promise.resolve(s.value).then(c,y);u((t=t.apply(n,e)).next())});window.onload=f;function f(){return a(this,null,function*(){let n=d();n&&(yield n.wait(),n.optimistic())})}function d(){let n,e=document.location.href;if(e.match("live"))n=new m;else{let t=e.match(/video|bangumi/);t&&(n=new r(t[0]))}return n}var m=class{optimistic(){this.hideElement(),this.switchWebFullscreen(),this.switchBestQuality(),this.hideChatPanel()}wait(){return a(this,null,function*(){for(;yield new Promise(t=>setTimeout(t,100)),document.querySelector("video")===null;);})}hideElement(){let e=document.querySelector("head");if(e===null)return;let t="#my-dear-haruna-vm{display:none !important}",i=document.createElement("style");i.type="text/css",i.appendChild(document.createTextNode(t)),e.appendChild(i)}hideChatPanel(){let e=document.querySelector("#aside-area-toggle-btn");e!==null&&e.click()}switchWebFullscreen(){let e=document.querySelector("#live-player");if(e===null)return;let t=new MouseEvent("mousemove",{view:window});e.dispatchEvent(t);let i=document.querySelector(".right-area");if(i===null)return;let l=i.children.item(1);if(l===null)return;let c=l.querySelector("span");c!==null&&c.click()}switchBestQuality(){let e=window.livePlayer||window.top.livePlayer;if(!e)return;let t=e.getPlayerInfo(),i=t.qualityCandidates;i.length!==0&&i[0].qn!==t.quality&&e.switchQuality(i[0].qn)}},h=class{constructor(e){this.config=h.CONFIG[e]}optimistic(){return a(this,null,function*(){this.switchWebFullscreen(),this.switchBestQuality()})}wait(){return a(this,null,function*(){if(this.config.waitSelector)for(;yield new Promise(t=>setTimeout(t,100)),document.querySelector(this.config.waitSelector)===null;);})}switchWebFullscreen(){if(!this.config.webFullscreenSelector||!this.config.activeWebFullscreenClassName)return;let e=document.querySelector(this.config.webFullscreenSelector);console.log(e),e!==null&&(e.classList.contains(this.config.activeWebFullscreenClassName)||e.click())}switchBestQuality(){if(!this.config.qualitySelector||!this.config.activeQualityClassName)return;let e=document.querySelector(this.config.qualitySelector);if(e===null)return;let t=e.children.length;for(let i=0;i<t;i++){let l=e.children.item(i);if(l===null||l.classList.contains(this.config.activeQualityClassName))break;this.isBigVipQuality(l)||l.click()}}isBigVipQuality(e){if(!this.config.bigVipQualityClassName)return!1;let t=e.children.length;for(let i=0;i<t;i++){let l=e.children.item(i);if(l===null)break;if(l.classList.contains(this.config.bigVipQualityClassName))return!0}return!1}},r=h;r.CONFIG={video:{waitSelector:".bpx-player-ctrl-web",qualitySelector:"ul.bpx-player-ctrl-quality-menu",activeQualityClassName:"bpx-state-active",webFullscreenSelector:".bpx-player-ctrl-web",activeWebFullscreenClassName:"bpx-state-entered"},bangumi:{waitSelector:".squirtle-video-pagefullscreen",bigVipQualityClassName:"squirtle-bigvip",qualitySelector:"ul.squirtle-quality-select-list",activeQualityClassName:"active",webFullscreenSelector:".squirtle-video-pagefullscreen",activeWebFullscreenClassName:"active"}};})();
