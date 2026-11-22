import { createRoot, type Root } from 'react-dom/client'
import { RuntimeMenu, type RuntimeMenuProps } from './RuntimeMenu'
import css from './styles.css?inline'

type Zone = 'order' | 'invoice'
type HostProps = Omit<RuntimeMenuProps, 'menuUrl'> & { currentZone?: Zone }

// 本檔案由 order 提供（/menu-runtime/menu-runtime.js），menu 資料讀同網域 order 的 /api/menu
const MENU_URL = new URL(/* @vite-ignore */ '/api/menu', import.meta.url).toString()

class RuntimeSiteMenuElement extends HTMLElement {
  #root: Root | null = null
  #props: HostProps = {}
  #scheduled = false

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = css
    const mount = document.createElement('div')
    shadow.replaceChildren(style, mount)
    this.#root = createRoot(mount)
    this.#render()
  }

  disconnectedCallback() {
    const root = this.#root
    this.#root = null
    // 延後 unmount，避免在 host React commit 期間同步卸載另一個 root
    queueMicrotask(() => root?.unmount())
  }

  get currentZone() { return this.#props.currentZone }
  set currentZone(value) { this.#set({ currentZone: value }) }
  get pathname() { return this.#props.pathname }
  set pathname(value) { this.#set({ pathname: value }) }
  get user() { return this.#props.user }
  set user(value) { this.#set({ user: value }) }
  get navigate() { return this.#props.navigate }
  set navigate(value) { this.#set({ navigate: value }) }

  #set(patch: HostProps) {
    this.#props = { ...this.#props, ...patch }
    if (this.#scheduled) return
    this.#scheduled = true
    queueMicrotask(() => {
      this.#scheduled = false
      this.#render()
    })
  }

  #render() {
    const { currentZone: _zone, ...props } = this.#props
    this.#root?.render(<RuntimeMenu menuUrl={MENU_URL} {...props} />)
  }
}

if (!customElements.get('runtime-site-menu')) {
  customElements.define('runtime-site-menu', RuntimeSiteMenuElement)
}
