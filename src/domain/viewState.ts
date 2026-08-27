import type { GlandId } from '../types/gland'

/**
 * 应用的视图状态。
 *
 * 之所以需要一个模式而不只是"当前选中哪个腺体"：卵巢与睾丸在解剖学上
 * 互斥，同一具人体不可能两者兼有。人体上放的是卵巢，睾丸则由一个独立的
 * 详情视图承载，进出这个视图是模式切换，不是选中项变化。
 *
 * 这里是纯数据 + 纯函数，无 React 无 three，因此整套状态迁移可以被单测
 * 覆盖，UI 层只负责把事件接到这些函数上。
 */
export type ViewState =
  | { readonly mode: 'body'; readonly selectedId: GlandId | null }
  | { readonly mode: 'detail'; readonly glandId: GlandId }

export const INITIAL_VIEW: ViewState = { mode: 'body', selectedId: null }

export function isDetail(view: ViewState): boolean {
  return view.mode === 'detail'
}

/**
 * 人体模式下选中/取消选中腺体。
 * 详情模式下是空操作 —— 人体此刻不在画面上，那些腺体点不到。
 */
export function selectGland(view: ViewState, id: GlandId | null): ViewState {
  if (view.mode === 'detail') {
    return view
  }
  return { mode: 'body', selectedId: id }
}

/** 进入某个腺体的独立详情视图。 */
export function openDetail(glandId: GlandId): ViewState {
  return { mode: 'detail', glandId }
}

/** 退出详情，回到人体概览。 */
export function exitDetail(): ViewState {
  return INITIAL_VIEW
}

/**
 * 关闭知识卡。人体模式下只取消选中；详情模式下等同于退出详情 ——
 * 详情视图的卡片和视图是一体的，只关卡片会留下一个说不清的空视图。
 */
export function closeCard(view: ViewState): ViewState {
  return view.mode === 'detail' ? exitDetail() : selectGland(view, null)
}

/** 知识卡当前该显示哪个腺体。两种模式下都可能有内容。 */
export function cardGlandId(view: ViewState): GlandId | null {
  return view.mode === 'detail' ? view.glandId : view.selectedId
}

/**
 * 人体场景里该高亮/聚焦哪个腺体。
 * 详情模式返回 null —— 人体场景此刻并未渲染。
 */
export function bodySelectedId(view: ViewState): GlandId | null {
  return view.mode === 'body' ? view.selectedId : null
}
