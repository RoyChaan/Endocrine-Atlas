/**
 * 把 `public/` 下的根绝对路径接到部署前缀上。
 *
 * 本地 `vite dev` 和自建根域下 `BASE_URL` 就是 `/`，接出来还是原路径；
 * GitHub Pages 这类子路径部署（`/Endocrine-Atlas/`）下，运行时 fetch 的
 * 模型地址必须带上前缀，否则会打到域名根上 404。`index.html` 里的
 * script/link 由 Vite 自己改写，只有这些**运行时**拼出来的地址得手动接。
 */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path
}
